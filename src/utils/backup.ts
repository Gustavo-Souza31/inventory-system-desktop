import { db } from '../database/db';

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

export async function exportDatabase(): Promise<void> {
    const [products, categories, suppliers, movements, settings, priceHistory, locations, productStock] = await Promise.all([
        db.products.toArray(),
        db.categories.toArray(),
        db.suppliers.toArray(),
        db.movements.toArray(),
        db.settings.toArray(),
        db.priceHistory.toArray(),
        db.locations.toArray(),
        db.productStock.toArray(),
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

        // Clear all tables
        await Promise.all([
            db.products.clear(),
            db.categories.clear(),
            db.suppliers.clear(),
            db.movements.clear(),
            db.settings.clear(),
            db.priceHistory.clear(),
            db.locations.clear(),
            db.productStock.clear(),
        ]);

        // Import data (cada item passa por sanitizeForImport antes de chegar no banco)
        if (data.categories?.length) await db.categories.bulkAdd(sanitizeForImport('categories', data.categories));
        if (data.suppliers?.length) await db.suppliers.bulkAdd(sanitizeForImport('suppliers', data.suppliers));
        if (data.products?.length) await db.products.bulkAdd(sanitizeForImport('products', data.products));
        if (data.movements?.length) await db.movements.bulkAdd(sanitizeForImport('movements', data.movements));
        if (data.settings?.length) await db.settings.bulkAdd(sanitizeForImport('settings', data.settings));
        if (data.priceHistory?.length) await db.priceHistory.bulkAdd(sanitizeForImport('priceHistory', data.priceHistory));
        if (data.locations?.length) await db.locations.bulkAdd(sanitizeForImport('locations', data.locations));
        if (data.productStock?.length) await db.productStock.bulkAdd(sanitizeForImport('productStock', data.productStock));

        return {
            success: true,
            message: `Importado com sucesso: ${data.products.length} produtos, ${data.categories.length} categorias, ${data.suppliers?.length || 0} fornecedores.`,
        };
    } catch {
        return { success: false, message: 'Erro ao ler o arquivo. Verifique se é um backup válido.' };
    }
}
