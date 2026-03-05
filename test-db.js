const { Pool } = require('pg');

const pool = new Pool({
    host: 'ep-calm-fire-acc9d06h-pooler.sa-east-1.aws.neon.tech',
    port: 5432,
    database: 'neondb',
    user: 'neondb_owner',
    password: 'npg_0s2cCQTMWKGU',
    ssl: { rejectUnauthorized: false }
});

pool.connect()
    .then(client => {
        console.log('SUCCESS: Conexao estabelecida com Neon!');
        client.release();
        pool.end();
    })
    .catch(err => {
        console.error('ERROR:', err.message);
        pool.end();
    });
