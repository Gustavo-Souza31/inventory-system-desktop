import { getAll, insert, clearTable } from '../database/sql-wrapper';
import type { Product, Category, Supplier, Movement, Settings, PriceHistory, Location, ProductStock } from '../database/types';

// Colunas reais de cada tabela (veja electron/database.ts). Qualquer chave
// fora dessa lista é descartada ao importar um backup — o JSON importado é
// dado não confiável, e sql-wrapper.ts usa as chaves do objeto como nomes de
// coluna no SQL sem validar contra o schema.
const ALLOWED_COLUMNS: Record<string, string[]> = {
    categories: ['name', 'description', 'color', 'createdAt'],
    suppliers: ['name', 'email', 'phone', 'address', 'notes', 'createdAt'],
    products: [
        'name', 'sku', 'description', 'categoryId', 'supplierId',
        'price', 'costPrice', 'quantity', 'minStock', 'unit', 'createdAt', 'updatedAt',
    ],
    movements: ['productId', 'type', 'quantity', 'reason', 'notes', 'locationId', 'date', 'createdAt'],
    settings: ['companyName', 'cnpj', 'lowStockThreshold'],
    priceHistory: ['productId', 'oldPrice', 'newPrice', 'oldCostPrice', 'newCostPrice', 'changedAt'],
    locations: ['name', 'address', 'description', 'createdAt'],
    productStock: ['productId', 'locationId', 'quantity'],
};

function sanitizeForImport(table: string, items: unknown): Record<string, any>[] {
    const allowedCols = ALLOWED_COLUMNS[table];
    if (!allowedCols || !Array.isArray(items)) return [];

    return items
        .filter((item) => item && typeof item === 'object')
        .map((item) => {
            const clean: Record<string, any> = {};
            for (const col of allowedCols) {
                if (col in item) clean[col] = item[col];
            }
            return clean;
        });
}

async function bulkInsert(table: string, items: Record<string, any>[]): Promise<void> {
    for (const item of items) {
        await insert(table, item);
    }
}

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
}

export async function importDatabase(file: File): Promise<{ success: boolean; message: string }> {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.products || !data.categories) {
            return { success: false, message: 'Arquivo inválido: formato não reconhecido.' };
        }

        // Limpa as tabelas em sequência (não em paralelo): products.categoryId
        // tem ON DELETE RESTRICT, então products precisa ser limpo antes de
        // categories, senão o banco bloqueia a exclusão da categoria.
        const clearOrder = [
            'movements', 'priceHistory', 'productStock', 'products',
            'categories', 'suppliers', 'locations', 'settings',
        ];
        for (const table of clearOrder) {
            await clearTable(table);
        }

        // Importa na ordem que respeita as FOREIGN KEYs (a tabela referenciada
        // precisa existir antes da que referencia ela). Cada item passa por
        // sanitizeForImport antes de chegar no banco.
        if (data.categories?.length) await bulkInsert('categories', sanitizeForImport('categories', data.categories));
        if (data.suppliers?.length) await bulkInsert('suppliers', sanitizeForImport('suppliers', data.suppliers));
        if (data.locations?.length) await bulkInsert('locations', sanitizeForImport('locations', data.locations));
        if (data.settings?.length) await bulkInsert('settings', sanitizeForImport('settings', data.settings));
        if (data.products?.length) await bulkInsert('products', sanitizeForImport('products', data.products));
        if (data.priceHistory?.length) await bulkInsert('priceHistory', sanitizeForImport('priceHistory', data.priceHistory));
        if (data.movements?.length) await bulkInsert('movements', sanitizeForImport('movements', data.movements));
        if (data.productStock?.length) await bulkInsert('productStock', sanitizeForImport('productStock', data.productStock));

        return {
            success: true,
            message: `Importado com sucesso: ${data.products.length} produtos, ${data.categories.length} categorias, ${data.suppliers?.length || 0} fornecedores.`,
        };
    } catch {
        return { success: false, message: 'Erro ao ler o arquivo. Verifique se é um backup válido.' };
    }
}
