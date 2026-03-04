import { db } from '../database/db';

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

        // Import data
        if (data.categories?.length) await db.categories.bulkAdd(data.categories);
        if (data.suppliers?.length) await db.suppliers.bulkAdd(data.suppliers);
        if (data.products?.length) await db.products.bulkAdd(data.products);
        if (data.movements?.length) await db.movements.bulkAdd(data.movements);
        if (data.settings?.length) await db.settings.bulkAdd(data.settings);
        if (data.priceHistory?.length) await db.priceHistory.bulkAdd(data.priceHistory);
        if (data.locations?.length) await db.locations.bulkAdd(data.locations);
        if (data.productStock?.length) await db.productStock.bulkAdd(data.productStock);

        return {
            success: true,
            message: `Importado com sucesso: ${data.products.length} produtos, ${data.categories.length} categorias, ${data.suppliers?.length || 0} fornecedores.`,
        };
    } catch {
        return { success: false, message: 'Erro ao ler o arquivo. Verifique se é um backup válido.' };
    }
}
