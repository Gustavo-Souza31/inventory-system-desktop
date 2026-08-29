import { getAll } from '../database/sql-wrapper';
import type { Product, Supplier } from '../database/types';

export interface LowStockAlert {
    product: Product;
    supplier: Supplier | null;
}

export async function getLowStockAlerts(): Promise<LowStockAlert[]> {
    const [products, suppliers] = await Promise.all([
        getAll<Product>('products'),
        getAll<Supplier>('suppliers'),
    ]);
    const supplierById = new Map(suppliers.map((s) => [s.id, s]));

    return products
        .filter((p) => p.quantity <= p.minStock)
        .map((product) => ({
            product,
            supplier: product.supplierId ? supplierById.get(product.supplierId) ?? null : null,
        }));
}
