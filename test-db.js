const { Pool } = require('pg');

async function test(label, config) {
    const pool = new Pool(config);
    try {
        const client = await pool.connect();
        console.log(`SUCCESS [${label}]`);
        client.release();
    } catch (err) {
        console.error(`FAIL [${label}]: ${err.message}`);
    } finally {
        await pool.end();
    }
}

(async () => {
    const configs = [
        // Pooler com porta 6543, user com project ref
        { label: 'Pooler-6543-projUser', host: 'aws-0-sa-east-1.pooler.supabase.com', port: 6543, database: 'postgres', user: 'postgres.izfjthgnldfyoswwstwr', password: 'Rummikub@9131', ssl: { rejectUnauthorized: false } },

        // Pooler porta 5432 transaction mode, user com project ref
        { label: 'Pooler-5432-projUser', host: 'aws-0-sa-east-1.pooler.supabase.com', port: 5432, database: 'postgres', user: 'postgres.izfjthgnldfyoswwstwr', password: 'Rummikub@9131', ssl: { rejectUnauthorized: false } },

        // Direct .supabase.co (original do usuario)
        { label: 'Direct-co', host: 'db.izfjthgnldfyoswwstwr.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: 'Rummikub@9131', ssl: { rejectUnauthorized: false } },

        // Direct com .supabase.com
        { label: 'Direct-com', host: 'db.izfjthgnldfyoswwstwr.supabase.com', port: 5432, database: 'postgres', user: 'postgres', password: 'Rummikub@9131', ssl: { rejectUnauthorized: false } },

        // Senha com colchetes (caso sejam parte da senha real)
        { label: 'Pooler-6543-bracketPass', host: 'aws-0-sa-east-1.pooler.supabase.com', port: 6543, database: 'postgres', user: 'postgres.izfjthgnldfyoswwstwr', password: '[Rummikub@9131]', ssl: { rejectUnauthorized: false } },
    ];

    for (const { label, ...config } of configs) {
        await test(label, config);
    }
})();
