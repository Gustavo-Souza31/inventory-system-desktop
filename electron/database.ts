import { Pool, PoolConfig } from 'pg';

let pool: Pool | null = null;

export async function connectToDatabase(config: PoolConfig) {
    if (pool) {
        await pool.end();
    }

    // Suporte para bancos em nuvem (ex: Supabase) que usam certificados auto-assinados no pooler
    const dbConfig = { ...config };
    if (dbConfig.ssl) {
        dbConfig.ssl = { rejectUnauthorized: false };
    }

    pool = new Pool(dbConfig);
    // Test connection
    const client = await pool.connect();
    try {
        await initializeSchema(client);
    } finally {
        client.release();
    }
    return true;
}

async function initializeSchema(client: any) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS "categories" (
            "id" SERIAL PRIMARY KEY,
            "name" VARCHAR(255) NOT NULL,
            "description" TEXT,
            "color" VARCHAR(50),
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "suppliers" (
            "id" SERIAL PRIMARY KEY,
            "name" VARCHAR(255) NOT NULL,
            "email" VARCHAR(255),
            "phone" VARCHAR(50),
            "address" TEXT,
            "notes" TEXT,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "products" (
            "id" SERIAL PRIMARY KEY,
            "name" VARCHAR(255) NOT NULL,
            "sku" VARCHAR(100) UNIQUE NOT NULL,
            "description" TEXT,
            "categoryId" INTEGER,
            "supplierId" INTEGER,
            "price" DECIMAL(10,2) NOT NULL,
            "costPrice" DECIMAL(10,2) NOT NULL,
            "quantity" INTEGER NOT NULL DEFAULT 0,
            "minStock" INTEGER NOT NULL DEFAULT 0,
            "unit" VARCHAR(50) NOT NULL,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "locations" (
            "id" SERIAL PRIMARY KEY,
            "name" VARCHAR(255) NOT NULL,
            "address" TEXT,
            "description" TEXT,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "movements" (
            "id" SERIAL PRIMARY KEY,
            "productId" INTEGER NOT NULL,
            "type" VARCHAR(50) NOT NULL,
            "quantity" INTEGER NOT NULL,
            "reason" TEXT,
            "notes" TEXT,
            "locationId" INTEGER,
            "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "settings" (
            "id" SERIAL PRIMARY KEY,
            "companyName" VARCHAR(255),
            "cnpj" VARCHAR(50),
            "lowStockThreshold" INTEGER DEFAULT 10
        );

        CREATE TABLE IF NOT EXISTS "priceHistory" (
            "id" SERIAL PRIMARY KEY,
            "productId" INTEGER NOT NULL,
            "oldPrice" DECIMAL(10,2) NOT NULL,
            "newPrice" DECIMAL(10,2) NOT NULL,
            "oldCostPrice" DECIMAL(10,2) NOT NULL,
            "newCostPrice" DECIMAL(10,2) NOT NULL,
            "changedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "productStock" (
            "id" SERIAL PRIMARY KEY,
            "productId" INTEGER NOT NULL,
            "locationId" INTEGER NOT NULL,
            "quantity" INTEGER NOT NULL DEFAULT 0
        );
    `);
}

export async function queryDatabase(text: string, values?: any[]) {
    if (!pool) {
        throw new Error("Banco de dados não conectado. Configure a conexão nas Configurações.");
    }
    const result = await pool.query(text, values);
    return result;
}

export async function disconnectDatabase() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
