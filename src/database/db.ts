import Dexie, { type Table } from 'dexie';
import type { Product, Category, Supplier, Movement, Settings, PriceHistory, Location, ProductStock } from './types';

export class InventoryDB extends Dexie {
    products!: Table<Product, number>;
    categories!: Table<Category, number>;
    suppliers!: Table<Supplier, number>;
    movements!: Table<Movement, number>;
    settings!: Table<Settings, number>;
    priceHistory!: Table<PriceHistory, number>;
    locations!: Table<Location, number>;
    productStock!: Table<ProductStock, number>;

    constructor() {
        super('InventorySystemDB');

        this.version(1).stores({
            products: '++id, name, sku, categoryId, supplierId, quantity',
            categories: '++id, name',
            suppliers: '++id, name',
            movements: '++id, productId, type, date',
            settings: '++id',
        });

        this.version(2).stores({
            products: '++id, name, sku, categoryId, supplierId, quantity',
            categories: '++id, name',
            suppliers: '++id, name',
            movements: '++id, productId, type, date, locationId',
            settings: '++id',
            priceHistory: '++id, productId, changedAt',
            locations: '++id, name',
            productStock: '++id, productId, locationId, [productId+locationId]',
        });
    }
}

export const db = new InventoryDB();
