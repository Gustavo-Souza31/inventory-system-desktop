import { getAll, rpc } from '../database/sql-wrapper';
import type { Product, Category, Supplier, Movement, Settings, PriceHistory, Location, ProductStock } from '../database/types';

export async function exportDatabase(): Promise<void> {
    const [products, categories, suppliers, movements, settings, priceHistory, locations, productStock] = await Promise.all([
        getAll<Product>('products'),
        getAll<Category>('categories'),
        getAll<Supplier>('suppliers'),
        getAll<Movement>('movements'),
        getAll<Settings>('settings'),
        getAll<PriceHistory>('priceHistory'),
        getAll<Location>('locations'),
        getAll<ProductStock>('productStock'),
    ]);

    const data = {
        version: 2,
        exportedAt: new Date().toISOString(),
        products,
        categories,
        suppliers,
        movements,
        settings,
        priceHistory,
        locations,
        productStock,
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    markBackupDone();
}

const LAST_BACKUP_KEY = 'empacota:lastBackupAt';

// Data do último backup manual feito neste computador (só um lembrete: o
// armazenamento do navegador pode ser limpo, e o backup de verdade é o do
// Supabase). Retorna null se nunca foi feito ou se o armazenamento falhar.
export function getLastBackupAt(): Date | null {
    try {
        const raw = localStorage.getItem(LAST_BACKUP_KEY);
        if (!raw) return null;
        const date = new Date(raw);
        return Number.isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
}

function markBackupDone(): void {
    try {
        localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    } catch {
        // Sem localStorage (modo restrito): o lembrete só não aparece.
    }
}

// Dias desde o último backup manual, ou null se nunca houve.
export function daysSinceLastBackup(now: Date = new Date()): number | null {
    const last = getLastBackupAt();
    if (!last) return null;
    return Math.floor((now.getTime() - last.getTime()) / 86_400_000);
}

interface RestoreSummary {
    categories: number;
    suppliers: number;
    locations: number;
    settings: number;
    products: number;
    priceHistory: number;
    movements: number;
    productStock: number;
}

// Restaura um backup dentro de UMA transação atômica no banco (função
// restore_backup em supabase/schema.sql, chamada via RPC): apaga os dados
// atuais do usuário e reinsere o backup remapeando os IDs antigos pros
// novos (categoryId/supplierId/productId/locationId). Se qualquer parte
// falhar — dado inválido, referência que não existe no próprio backup,
// erro de rede/permissão — a transação inteira é revertida pelo Postgres,
// nada fica parcialmente restaurado. Ver o comentário da função no
// schema.sql para os detalhes do remapeamento.
export async function importDatabase(file: File): Promise<{ success: boolean; message: string }> {
    let data: any;
    try {
        const text = await file.text();
        data = JSON.parse(text);
    } catch {
        return { success: false, message: 'Erro ao ler o arquivo: não é um JSON válido.' };
    }

    if (!data.products || !data.categories) {
        return { success: false, message: 'Arquivo inválido: formato não reconhecido (faltam as chaves "products"/"categories").' };
    }

    try {
        const summary = await rpc<RestoreSummary>('restore_backup', { payload: data });
        const parts = [`${summary.products} produto(s)`];
        if (summary.categories > 0) parts.push(`${summary.categories} categoria(s)`);
        if (summary.suppliers > 0) parts.push(`${summary.suppliers} fornecedor(es)`);
        if (summary.locations > 0) parts.push(`${summary.locations} local(is)`);
        if (summary.movements > 0) parts.push(`${summary.movements} movimentação(ões)`);
        if (summary.priceHistory > 0) parts.push(`${summary.priceHistory} registro(s) de histórico de preço`);
        if (summary.productStock > 0) parts.push(`${summary.productStock} registro(s) de estoque por local`);
        return { success: true, message: `Backup restaurado: ${parts.join(', ')}.` };
    } catch (err) {
        // Erro real do banco (RAISE EXCEPTION da função, violação de
        // constraint, falha de rede/permissão) — não uma mensagem genérica.
        // Nada foi alterado: a transação no banco já reverteu tudo sozinha.
        const message = err instanceof Error ? err.message : 'Erro desconhecido ao restaurar o backup.';
        return { success: false, message: `Falha ao restaurar backup (nada foi alterado): ${message}` };
    }
}
