import { getAll, rpc } from '../database/sql-wrapper';
import type { Product, ProductStock } from '../database/types';

// Uma linha da tela de contagem: o que o sistema espera e o que foi contado.
// counted === null significa "ainda não contado" (não gera ajuste).
export interface CountLine {
    productId: number;
    name: string;
    sku: string;
    unit: string;
    expected: number;
    counted: number | null;
}

export interface CountSummary {
    total: number;
    counted: number;
    withDifference: number;
    surplus: number;
    shortage: number;
}

// Monta a lista "esperado" para contagem. Sem local, o esperado é o estoque
// total do produto; com local, é o saldo daquele local (0 se nunca houve).
export function buildExpectedLines(
    products: Product[],
    stockRows: ProductStock[],
    locationId: number | null
): CountLine[] {
    const stockByProduct = new Map<number, number>();
    if (locationId !== null) {
        for (const s of stockRows) {
            if (s.locationId === locationId) stockByProduct.set(s.productId, s.quantity);
        }
    }
    return products
        .filter((p) => p.id !== undefined)
        .map((p) => ({
            productId: p.id!,
            name: p.name,
            sku: p.sku,
            unit: p.unit,
            expected: locationId === null ? p.quantity : stockByProduct.get(p.id!) ?? 0,
            counted: null,
        }));
}

// Diferença = contado - esperado. Positiva = sobra, negativa = falta.
// Linhas não contadas não têm diferença.
export function lineDifference(line: CountLine): number {
    return line.counted === null ? 0 : line.counted - line.expected;
}

export function summarizeCount(lines: CountLine[]): CountSummary {
    const summary: CountSummary = { total: lines.length, counted: 0, withDifference: 0, surplus: 0, shortage: 0 };
    for (const line of lines) {
        if (line.counted === null) continue;
        summary.counted++;
        const diff = lineDifference(line);
        if (diff === 0) continue;
        summary.withDifference++;
        if (diff > 0) summary.surplus += diff;
        else summary.shortage += -diff;
    }
    return summary;
}

export async function loadCountLines(locationId: number | null): Promise<CountLine[]> {
    const [products, stockRows] = await Promise.all([
        getAll<Product>('products'),
        locationId === null ? Promise.resolve([] as ProductStock[]) : getAll<ProductStock>('productStock'),
    ]);
    return buildExpectedLines(products, stockRows, locationId);
}

export interface ApplyCountResult {
    applied: boolean;
    adjusted: number;
    reason?: string;
}

// Grava a contagem e aplica os ajustes. Só linhas contadas entram.
export async function saveAndApplyCount(
    lines: CountLine[],
    locationId: number | null,
    notes = ''
): Promise<ApplyCountResult> {
    const counted = lines.filter((l) => l.counted !== null);
    if (counted.length === 0) throw new Error('Informe a quantidade contada de pelo menos um produto.');
    if (counted.some((l) => !Number.isInteger(l.counted) || (l.counted as number) < 0)) {
        throw new Error('As quantidades contadas devem ser números inteiros maiores ou iguais a zero.');
    }

    // Uma única chamada: o banco grava a contagem e os itens e aplica os ajustes
    // na mesma transação. Se qualquer parte falhar, nada fica gravado (sem
    // contagens órfãs, e uma contagem já aplicada nunca é apagada por engano).
    return rpc<ApplyCountResult>('save_and_apply_stock_count', {
        p_location_id: locationId,
        p_notes: notes,
        p_items: counted.map((l) => ({
            productId: l.productId,
            expected: l.expected,
            counted: l.counted,
        })),
    });
}
