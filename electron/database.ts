import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

let db: Database.Database | null = null;

export function initDatabase() {
    const dbPath = path.join(app.getPath('userData'), 'inventory.db');
    db = new Database(dbPath);

    // SQLite não aplica FOREIGN KEY por padrão — precisa ligar em cada conexão
    db.pragma('foreign_keys = ON');

    initializeSchema(db);
}

function initializeSchema(database: Database.Database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS "categories" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "name" VARCHAR(255) NOT NULL,
            "description" TEXT,
            "color" VARCHAR(50),
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "suppliers" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "name" VARCHAR(255) NOT NULL,
            "email" VARCHAR(255),
            "phone" VARCHAR(50),
            "address" TEXT,
            "notes" TEXT,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "products" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "name" VARCHAR(255) NOT NULL,
            "sku" VARCHAR(100) UNIQUE NOT NULL,
            "description" TEXT,
            "categoryId" INTEGER REFERENCES "categories"("id") ON DELETE RESTRICT,
            "supplierId" INTEGER REFERENCES "suppliers"("id") ON DELETE SET NULL,
            "price" DECIMAL(10,2) NOT NULL CHECK ("price" >= 0),
            "costPrice" DECIMAL(10,2) NOT NULL CHECK ("costPrice" >= 0),
            "quantity" INTEGER NOT NULL DEFAULT 0 CHECK ("quantity" >= 0),
            "minStock" INTEGER NOT NULL DEFAULT 0,
            "unit" VARCHAR(50) NOT NULL,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "locations" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "name" VARCHAR(255) NOT NULL,
            "address" TEXT,
            "description" TEXT,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "movements" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "productId" INTEGER NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
            "type" VARCHAR(50) NOT NULL,
            "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
            "reason" TEXT,
            "notes" TEXT,
            "locationId" INTEGER REFERENCES "locations"("id") ON DELETE SET NULL,
            "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "settings" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "companyName" VARCHAR(255),
            "cnpj" VARCHAR(50),
            "lowStockThreshold" INTEGER DEFAULT 10
        );

        CREATE TABLE IF NOT EXISTS "priceHistory" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "productId" INTEGER NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
            "oldPrice" DECIMAL(10,2) NOT NULL,
            "newPrice" DECIMAL(10,2) NOT NULL,
            "oldCostPrice" DECIMAL(10,2) NOT NULL,
            "newCostPrice" DECIMAL(10,2) NOT NULL,
            "changedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "productStock" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "productId" INTEGER NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
            "locationId" INTEGER NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
            "quantity" INTEGER NOT NULL DEFAULT 0 CHECK ("quantity" >= 0),
            UNIQUE ("productId", "locationId")
        );
    `);
}

export async function queryDatabase(text: string, values: any[] = []) {
    if (!db) {
        throw new Error("Banco de dados não inicializado.");
    }

    // better-sqlite3 só aceita number/string/bigint/buffer/null como parâmetro —
    // datas chegam como objetos Date vindos do renderer, então convertemos aqui.
    const params = values.map((v) => (v instanceof Date ? v.toISOString() : v));

    const stmt = db.prepare(text);
    const returnsRows = /^\s*select/i.test(text) || /returning/i.test(text);

    if (returnsRows) {
        const rows = stmt.all(...params);
        return { rows, rowCount: rows.length };
    }

    const info = stmt.run(...params);
    return { rows: [], rowCount: info.changes };
}
