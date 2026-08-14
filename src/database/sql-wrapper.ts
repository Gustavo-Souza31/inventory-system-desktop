// Define the structure of the IPC response
interface IpcResult {
    success: boolean;
    rows?: any[];
    rowCount?: number;
    error?: string;
}

// Helper to interact with main process
async function exec(text: string, values: any[] = []): Promise<any[]> {
    if (!(window as any).electronAPI) {
        throw new Error("O banco SQL exige execução via aplicativo Desktop. Rode 'npm run electron:dev'.");
    }
    const res: IpcResult = await (window as any).electronAPI.invoke('db:query', { text, values });
    if (!res.success) {
        console.error("SQL Error:", res.error, text, values);
        throw new Error(res.error);
    }
    return res.rows || [];
}

export async function getAll<T>(table: string): Promise<T[]> {
    return await exec(`SELECT * FROM "${table}"`);
}

export async function getById<T>(table: string, id: number): Promise<T | undefined> {
    const rows = await exec(`SELECT * FROM "${table}" WHERE id = ? LIMIT 1`, [id]);
    return rows[0];
}

export async function findWhere<T>(table: string, query: Record<string, any>): Promise<T[]> {
    const cols = Object.keys(query);
    const vals = Object.values(query);
    const where = cols.map((k) => `"${k}" = ?`).join(' AND ');
    return await exec(`SELECT * FROM "${table}" WHERE ${where}`, vals);
}

export async function insert(table: string, item: Record<string, any>): Promise<number> {
    const entries = Object.entries(item).filter(([k]) => k !== 'id');
    const cols = entries.map(([k]) => `"${k}"`);
    const placeholders = entries.map(() => '?');
    const vals = entries.map(([, v]) => v);
    const sql = `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
    const rows = await exec(sql, vals);
    return rows[0].id;
}

export async function updateById(table: string, id: number, changes: Record<string, any>): Promise<void> {
    const entries = Object.entries(changes).filter(([k]) => k !== 'id');
    const sets = entries.map(([k]) => `"${k}" = ?`);
    const vals = entries.map(([, v]) => v);
    vals.push(id);
    await exec(`UPDATE "${table}" SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function deleteById(table: string, id: number): Promise<void> {
    await exec(`DELETE FROM "${table}" WHERE id = ?`, [id]);
}

export async function clearTable(table: string): Promise<void> {
    await exec(`DELETE FROM "${table}"`);
    try {
        // sqlite_sequence só existe depois do primeiro INSERT em alguma
        // tabela AUTOINCREMENT; se ainda não existir, não há nada a resetar.
        await exec(`DELETE FROM sqlite_sequence WHERE name = ?`, [table]);
    } catch {
        // nada a resetar
    }
}
