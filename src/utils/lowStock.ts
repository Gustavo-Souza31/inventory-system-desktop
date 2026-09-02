import { getAll } from '../database/sql-wrapper';
import type { Product, Supplier, Settings } from '../database/types';

export interface LowStockAlert {
    product: Product;
    supplier: Supplier | null;
}

// Mesmo valor do DEFAULT da coluna settings.lowStockThreshold (schema.sql),
// usado quando ainda não existe uma linha de settings para o usuário.
const DEFAULT_LOW_STOCK_THRESHOLD = 10;

// products.minStock é NOT NULL DEFAULT 0 — não existe "vazio" distinto de
// zero nesse campo. Por isso 0 é tratado como "produto sem limite próprio
// definido" e usa o padrão das configurações como fallback; qualquer valor
// maior que 0 é o limite do próprio produto e tem prioridade sobre o padrão.
export function isLowStock(product: Pick<Product, 'quantity' | 'minStock'>, threshold: number): boolean {
    const effectiveMin = product.minStock > 0 ? product.minStock : threshold;
    return product.quantity <= effectiveMin;
}

export async function getLowStockThreshold(): Promise<number> {
    const [settings] = await getAll<Settings & { id: number }>('settings');
    return settings?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
}

export async function getLowStockAlerts(): Promise<LowStockAlert[]> {
    const [products, suppliers, threshold] = await Promise.all([
        getAll<Product>('products'),
        getAll<Supplier>('suppliers'),
        getLowStockThreshold(),
    ]);
    const supplierById = new Map(suppliers.map((s) => [s.id, s]));

    return products
        .filter((p) => isLowStock(p, threshold))
        .map((product) => ({
            product,
            supplier: product.supplierId ? supplierById.get(product.supplierId) ?? null : null,
        }));
}
