import type { Product, Category, Supplier, Movement, Settings, PriceHistory, Location, ProductStock } from './types';
import { SqlTable } from './sql-wrapper';

export class InventoryDB {
    products = new SqlTable<Product>('products');
    categories = new SqlTable<Category>('categories');
    suppliers = new SqlTable<Supplier>('suppliers');
    movements = new SqlTable<Movement>('movements');
    settings = new SqlTable<Settings>('settings');
    priceHistory = new SqlTable<PriceHistory>('priceHistory');
    locations = new SqlTable<Location>('locations');
    productStock = new SqlTable<ProductStock>('productStock');

    async delete() {
        // Drop all tables or clear databse
        await Promise.all([
            this.products.clear(),
            this.categories.clear(),
            this.suppliers.clear(),
            this.movements.clear(),
            this.settings.clear(),
            this.priceHistory.clear(),
            this.locations.clear(),
            this.productStock.clear()
        ]);
    }
}

export const db = new InventoryDB();
