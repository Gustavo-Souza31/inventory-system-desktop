import * as XLSX from 'xlsx';
import { insert, updateById } from '../database/sql-wrapper';
import type { Category, Supplier, Product } from '../database/types';

// Unidades aceitas — mesmo enum usado no formulário de produto (Products.tsx).
const ALLOWED_UNITS = ['un', 'kg', 'l', 'm', 'cx', 'pct'];

export interface ImportRowData {
    name: string;
    sku: string;
    description: string;
    categoryName: string;
    supplierName: string;
    price: number;
    costPrice: number;
    quantity: number;
    minStock: number;
    unit: string;
}

export interface ImportRow {
    rowNumber: number; // número da linha na planilha (cabeçalho = linha 1)
    data: ImportRowData;
    errors: string[];
    isDuplicate: boolean; // preenchido depois de comparar com SKUs existentes
}

export interface ParsedImport {
    rows: ImportRow[];
    missingColumns: string[]; // colunas obrigatórias que não foram encontradas no cabeçalho
}

type Field = keyof ImportRowData;

// Cabeçalhos aceitos, normalizados (sem acento/espaço/pontuação, minúsculo).
// Mantém aliases comuns em pt-BR (ex: "preço de custo", "custo", "qtd").
const HEADER_ALIASES: Record<string, Field> = {
    nome: 'name',
    sku: 'sku',
    codigo: 'sku',
    descricao: 'description',
    categoria: 'categoryName',
    fornecedor: 'supplierName',
    preco: 'price',
    precovenda: 'price',
    precodevenda: 'price',
    precocusto: 'costPrice',
    precodecusto: 'costPrice',
    custo: 'costPrice',
    quantidade: 'quantity',
    qtd: 'quantity',
    estoqueminimo: 'minStock',
    estoquemin: 'minStock',
    minimo: 'minStock',
    unidade: 'unit',
};

const REQUIRED_FIELDS: { field: Field; label: string }[] = [
    { field: 'name', label: 'nome' },
    { field: 'sku', label: 'sku' },
    { field: 'price', label: 'preco' },
    { field: 'costPrice', label: 'preco_custo' },
    { field: 'quantity', label: 'quantidade' },
    { field: 'unit', label: 'unidade' },
];

function normalizeHeader(raw: unknown): string {
    return String(raw ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '');
}

function parseNumber(raw: unknown): number | null {
    if (raw === '' || raw === null || raw === undefined) return null;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
    const normalized = String(raw).trim().replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
}

function validateRow(data: ImportRowData): string[] {
    const errors: string[] = [];
    if (!data.name.trim()) errors.push('nome vazio');
    if (!data.sku.trim()) errors.push('SKU vazio');
    if (data.price === null || (data.price as number) < 0 || Number.isNaN(data.price)) errors.push('preço inválido');
    if (data.costPrice === null || (data.costPrice as number) < 0 || Number.isNaN(data.costPrice)) errors.push('preço de custo inválido');
    if (data.quantity === null || (data.quantity as number) < 0 || !Number.isInteger(data.quantity)) errors.push('quantidade inválida');
    if (data.minStock !== null && ((data.minStock as number) < 0 || !Number.isInteger(data.minStock))) errors.push('estoque mínimo inválido');
    if (!ALLOWED_UNITS.includes(data.unit)) errors.push(`unidade inválida (use: ${ALLOWED_UNITS.join(', ')})`);
    return errors;
}

export async function parseImportFile(file: File): Promise<ParsedImport> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (raw.length === 0) {
        return { rows: [], missingColumns: REQUIRED_FIELDS.map((f) => f.label) };
    }

    const headerRow = raw[0];
    const columnByField = new Map<Field, number>();
    headerRow.forEach((h, i) => {
        const normalized = normalizeHeader(h);
        const field = HEADER_ALIASES[normalized];
        if (field && !columnByField.has(field)) columnByField.set(field, i);
    });

    const missingColumns = REQUIRED_FIELDS.filter((f) => !columnByField.has(f.field)).map((f) => f.label);
    if (missingColumns.length > 0) {
        return { rows: [], missingColumns };
    }

    function cell(row: unknown[], field: Field): unknown {
        const idx = columnByField.get(field);
        return idx === undefined ? '' : row[idx];
    }

    const rows: ImportRow[] = [];
    const seenSkus = new Set<string>();

    for (let i = 1; i < raw.length; i++) {
        const row = raw[i];
        const isEmpty = row.every((v) => String(v ?? '').trim() === '');
        if (isEmpty) continue;

        const minStockRaw = cell(row, 'minStock');
        const data: ImportRowData = {
            name: String(cell(row, 'name') ?? '').trim(),
            sku: String(cell(row, 'sku') ?? '').trim(),
            description: String(cell(row, 'description') ?? '').trim(),
            categoryName: String(cell(row, 'categoryName') ?? '').trim(),
            supplierName: String(cell(row, 'supplierName') ?? '').trim(),
            price: parseNumber(cell(row, 'price')) as number,
            costPrice: parseNumber(cell(row, 'costPrice')) as number,
            quantity: parseNumber(cell(row, 'quantity')) as number,
            minStock: minStockRaw === '' ? 0 : (parseNumber(minStockRaw) as number),
            unit: String(cell(row, 'unit') ?? '').trim().toLowerCase(),
        };

        const errors = validateRow(data);
        if (data.sku && seenSkus.has(data.sku.toLowerCase())) {
            errors.push('SKU repetido no próprio arquivo');
        }
        if (data.sku) seenSkus.add(data.sku.toLowerCase());

        rows.push({ rowNumber: i + 1, data, errors, isDuplicate: false });
    }

    return { rows, missingColumns: [] };
}

export function markDuplicates(rows: ImportRow[], existingProducts: Product[]): ImportRow[] {
    const existingSkus = new Set(existingProducts.map((p) => p.sku.toLowerCase()));
    return rows.map((row) => ({
        ...row,
        isDuplicate: row.errors.length === 0 && existingSkus.has(row.data.sku.toLowerCase()),
    }));
}

export function downloadImportTemplate(): void {
    const headers = ['Nome', 'SKU', 'Descrição', 'Categoria', 'Fornecedor', 'Preço', 'Preço de Custo', 'Quantidade', 'Estoque Mínimo', 'Unidade'];
    const sample = [
        ['Refrigerante Lata 350ml', 'BEB-001', 'Refrigerante sabor cola', 'Bebidas', 'Distribuidora ABC', 5.5, 3.2, 120, 20, 'un'],
        ['Arroz Branco 5kg', 'ALI-010', '', 'Alimentos', '', 28.9, 19.5, 40, 10, 'pct'],
    ];
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Produtos');
    XLSX.writeFile(workbook, 'modelo_importacao_produtos.xlsx');
}

export interface ImportSummary {
    insertedCount: number;
    updatedCount: number;
    skippedCount: number;
    skippedDetails: string[];
    createdCategories: string[];
    createdSuppliers: string[];
}

export async function commitImport(
    rows: ImportRow[],
    overwriteDuplicates: boolean,
    categories: Category[],
    suppliers: Supplier[],
    existingProducts: Product[],
): Promise<ImportSummary> {
    const summary: ImportSummary = {
        insertedCount: 0, updatedCount: 0, skippedCount: 0,
        skippedDetails: [], createdCategories: [], createdSuppliers: [],
    };

    const categoryMap = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id!]));
    const supplierMap = new Map(suppliers.map((s) => [s.name.trim().toLowerCase(), s.id!]));
    const skuMap = new Map(existingProducts.map((p) => [p.sku.toLowerCase(), p.id!]));

    for (const row of rows) {
        if (row.errors.length > 0) {
            summary.skippedCount++;
            summary.skippedDetails.push(`Linha ${row.rowNumber}: ${row.errors.join(', ')}`);
            continue;
        }

        const skuKey = row.data.sku.toLowerCase();
        const existingId = skuMap.get(skuKey);
        if (existingId && !overwriteDuplicates) {
            summary.skippedCount++;
            summary.skippedDetails.push(`Linha ${row.rowNumber}: SKU "${row.data.sku}" já existe (ignorado)`);
            continue;
        }

        let categoryId: number | null = null;
        if (row.data.categoryName) {
            const key = row.data.categoryName.toLowerCase();
            categoryId = categoryMap.get(key) ?? null;
            if (categoryId === null) {
                categoryId = await insert('categories', { name: row.data.categoryName, description: '', color: '#BF400D', createdAt: new Date() });
                categoryMap.set(key, categoryId);
                summary.createdCategories.push(row.data.categoryName);
            }
        }

        let supplierId: number | null = null;
        if (row.data.supplierName) {
            const key = row.data.supplierName.toLowerCase();
            supplierId = supplierMap.get(key) ?? null;
            if (supplierId === null) {
                supplierId = await insert('suppliers', { name: row.data.supplierName, email: '', phone: '', address: '', notes: '', createdAt: new Date() });
                supplierMap.set(key, supplierId);
                summary.createdSuppliers.push(row.data.supplierName);
            }
        }

        const now = new Date();
        const record = {
            name: row.data.name,
            sku: row.data.sku,
            description: row.data.description,
            categoryId,
            supplierId,
            price: row.data.price,
            costPrice: row.data.costPrice,
            quantity: row.data.quantity,
            minStock: row.data.minStock,
            unit: row.data.unit,
            updatedAt: now,
        };

        if (existingId) {
            await updateById('products', existingId, record);
            summary.updatedCount++;
        } else {
            const newId = await insert('products', { ...record, createdAt: now });
            skuMap.set(skuKey, newId);
            summary.insertedCount++;
        }
    }

    return summary;
}
