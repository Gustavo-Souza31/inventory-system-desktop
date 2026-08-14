import { Router, Response } from 'express';
import { getUserDb } from './db';
import { requireAuth, AuthedRequest } from './auth';

// Mesmas 8 tabelas do schema (server/src/db.ts) — nenhum outro nome de
// tabela é aceito nas rotas abaixo, mesmo princípio de whitelist já usado
// em src/utils/backup.ts (sanitizeForImport), agora protegendo um endpoint
// de verdade exposto na rede.
const ALLOWED_TABLES = [
    'categories', 'suppliers', 'products', 'locations',
    'movements', 'settings', 'priceHistory', 'productStock',
];

function checkTable(table: string, res: Response): boolean {
    if (!ALLOWED_TABLES.includes(table)) {
        res.status(400).json({ error: `Tabela inválida: ${table}` });
        return false;
    }
    return true;
}

export const apiRouter = Router();
apiRouter.use(requireAuth);

// GET /api/:table            -> getAll
// GET /api/:table?campo=val  -> findWhere
apiRouter.get('/:table', (req: AuthedRequest, res) => {
    const { table } = req.params;
    if (!checkTable(table, res)) return;
    const db = getUserDb(req.userId!);

    try {
        const filters = req.query as Record<string, string>;
        const cols = Object.keys(filters);
        if (cols.length > 0) {
            const where = cols.map((k) => `"${k}" = ?`).join(' AND ');
            const rows = db.prepare(`SELECT * FROM "${table}" WHERE ${where}`).all(...cols.map((k) => filters[k]));
            return res.json(rows);
        }
        res.json(db.prepare(`SELECT * FROM "${table}"`).all());
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/:table/:id -> getById
apiRouter.get('/:table/:id', (req: AuthedRequest, res) => {
    const { table, id } = req.params;
    if (!checkTable(table, res)) return;
    const db = getUserDb(req.userId!);

    try {
        const row = db.prepare(`SELECT * FROM "${table}" WHERE id = ?`).get(Number(id));
        if (!row) return res.status(404).json({ error: 'Não encontrado.' });
        res.json(row);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/:table -> insert
apiRouter.post('/:table', (req: AuthedRequest, res) => {
    const { table } = req.params;
    if (!checkTable(table, res)) return;
    const db = getUserDb(req.userId!);

    try {
        const entries = Object.entries(req.body || {}).filter(([k]) => k !== 'id');
        const cols = entries.map(([k]) => `"${k}"`);
        const placeholders = entries.map(() => '?');
        const vals = entries.map(([, v]) => v);
        const info = db.prepare(`INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`).run(...vals);
        res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/:table/:id -> updateById
apiRouter.put('/:table/:id', (req: AuthedRequest, res) => {
    const { table, id } = req.params;
    if (!checkTable(table, res)) return;
    const db = getUserDb(req.userId!);

    try {
        const entries = Object.entries(req.body || {}).filter(([k]) => k !== 'id');
        const sets = entries.map(([k]) => `"${k}" = ?`);
        const vals = entries.map(([, v]) => v);
        vals.push(Number(id));
        db.prepare(`UPDATE "${table}" SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/:table/:id -> deleteById
apiRouter.delete('/:table/:id', (req: AuthedRequest, res) => {
    const { table, id } = req.params;
    if (!checkTable(table, res)) return;
    const db = getUserDb(req.userId!);

    try {
        db.prepare(`DELETE FROM "${table}" WHERE id = ?`).run(Number(id));
        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/:table -> clearTable
apiRouter.delete('/:table', (req: AuthedRequest, res) => {
    const { table } = req.params;
    if (!checkTable(table, res)) return;
    const db = getUserDb(req.userId!);

    try {
        db.prepare(`DELETE FROM "${table}"`).run();
        try {
            db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
        } catch {
            // sqlite_sequence só existe depois do primeiro INSERT AUTOINCREMENT
        }
        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});
