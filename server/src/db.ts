import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');

fs.mkdirSync(USERS_DIR, { recursive: true });

let accountsDb: Database.Database | null = null;

export function getAccountsDb(): Database.Database {
    if (accountsDb) return accountsDb;

    accountsDb = new Database(path.join(DATA_DIR, 'accounts.db'));
    accountsDb.exec(`
        CREATE TABLE IF NOT EXISTS "users" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "email" VARCHAR(255) UNIQUE NOT NULL,
            "passwordHash" TEXT NOT NULL,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    return accountsDb;
}

// Um handle de banco por usuário, mantido aberto e reaproveitado entre
// requisições (abrir/fechar a cada request seria desperdício e pode
// disputar lock de arquivo à toa).
const userDbCache = new Map<number, Database.Database>();

export function getUserDb(userId: number): Database.Database {
    const cached = userDbCache.get(userId);
    if (cached) return cached;

    const dbPath = path.join(USERS_DIR, `${userId}.db`);
    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    initializeUserSchema(db);
    userDbCache.set(userId, db);
    return db;
}

// Mesmo schema de electron/database.ts (FK/CHECK/UNIQUE), só que agora
// um arquivo desses é criado por usuário em vez de um só por instalação
// do desktop.
function initializeUserSchema(db: Database.Database) {
    db.exec(`
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
