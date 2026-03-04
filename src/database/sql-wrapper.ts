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

export class SqlTable<T> {
    constructor(private tableName: string) { }

    private quoteCols(obj: any): { cols: string[], vals: any[], placeholders: string[] } {
        const cols: string[] = [];
        const vals: any[] = [];
        const placeholders: string[] = [];
        let i = 1;
        for (const [k, v] of Object.entries(obj)) {
            if (k === 'id') continue; // let DB handle auto increment
            cols.push(`"${k}"`);
            vals.push(v);
            placeholders.push(`$${i}`);
            i++;
        }
        return { cols, vals, placeholders };
    }

    async toArray(): Promise<T[]> {
        return await exec(`SELECT * FROM "${this.tableName}"`);
    }

    async get(id: number): Promise<T | undefined> {
        const rows = await exec(`SELECT * FROM "${this.tableName}" WHERE id = $1 LIMIT 1`, [id]);
        return rows[0];
    }

    async count(): Promise<number> {
        const rows = await exec(`SELECT COUNT(*) as c FROM "${this.tableName}"`);
        return parseInt(rows[0].c, 10);
    }

    async add(item: any): Promise<number> {
        const { cols, vals, placeholders } = this.quoteCols(item);
        const sql = `INSERT INTO "${this.tableName}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
        const rows = await exec(sql, vals);
        return rows[0].id;
    }

    async bulkAdd(items: any[]): Promise<void> {
        // Simplified: Loop inserts (not optimal, but works for our scale)
        for (const item of items) {
            await this.add(item);
        }
    }

    async update(id: number, changes: any): Promise<number> {
        const sets: string[] = [];
        const vals: any[] = [];
        let i = 1;
        for (const [k, v] of Object.entries(changes)) {
            if (k === 'id') continue;
            sets.push(`"${k}" = $${i}`);
            vals.push(v);
            i++;
        }
        vals.push(id);
        const sql = `UPDATE "${this.tableName}" SET ${sets.join(', ')} WHERE id = $${i} RETURNING id`;
        await exec(sql, vals);
        return 1;
    }

    async delete(id: number): Promise<void> {
        await exec(`DELETE FROM "${this.tableName}" WHERE id = $1`, [id]);
    }

    async clear(): Promise<void> {
        await exec(`TRUNCATE TABLE "${this.tableName}" RESTART IDENTITY CASCADE`);
    }

    // Builder methods
    toCollection() { return new SqlQueryBuilder<T>(this.tableName); }
    where(query: any | string) { return new SqlQueryBuilder<T>(this.tableName).where(query); }
    orderBy(col: string) { return new SqlQueryBuilder<T>(this.tableName).orderBy(col); }
}

class SqlQueryBuilder<T> {
    private conditions: string[] = [];
    private values: any[] = [];
    private orderCol?: string;
    private orderDir: 'ASC' | 'DESC' = 'ASC';
    private limitCount?: number;

    constructor(private tableName: string) { }

    where(query: any | string): this {
        if (typeof query === 'string') {
            // where('supplierId').equals(...) follows
            this.conditions.push(`"${query}" = $VAR`);
        } else {
            // where({ a: 1, b: 2 })
            for (const [k, v] of Object.entries(query)) {
                this.values.push(v);
                this.conditions.push(`"${k}" = $${this.values.length}`);
            }
        }
        return this;
    }

    equals(val: any): this {
        // Find the $VAR and replace it
        const idx = this.conditions.findIndex(c => c.includes('$VAR'));
        if (idx !== -1) {
            this.values.push(val);
            this.conditions[idx] = this.conditions[idx].replace('$VAR', `$${this.values.length}`);
        }
        return this;
    }

    aboveOrEqual(val: any): this {
        const idx = this.conditions.findIndex(c => c.includes('$VAR'));
        if (idx !== -1) {
            this.values.push(val);
            this.conditions[idx] = this.conditions[idx].replace('=', '>=').replace('$VAR', `$${this.values.length}`);
        }
        return this;
    }

    limit(n: number): this {
        this.limitCount = n;
        return this;
    }

    orderBy(col: string): this {
        this.orderCol = `"${col}"`;
        return this;
    }

    reverse(): this {
        this.orderDir = 'DESC';
        return this;
    }

    sortBy(col: string): Promise<T[]> {
        this.orderCol = `"${col}"`;
        return this.toArray();
    }

    async count(): Promise<number> {
        let sql = `SELECT COUNT(*) as c FROM "${this.tableName}"`;
        if (this.conditions.length > 0) {
            sql += ` WHERE ${this.conditions.join(' AND ')}`;
        }
        const rows = await exec(sql, this.values);
        return parseInt(rows[0].c, 10);
    }

    async delete(): Promise<void> {
        let sql = `DELETE FROM "${this.tableName}"`;
        if (this.conditions.length > 0) {
            sql += ` WHERE ${this.conditions.join(' AND ')}`;
        }
        await exec(sql, this.values);
    }

    async toArray(): Promise<T[]> {
        let sql = `SELECT * FROM "${this.tableName}"`;
        if (this.conditions.length > 0) {
            sql += ` WHERE ${this.conditions.join(' AND ')}`;
        }
        if (this.orderCol) {
            sql += ` ORDER BY ${this.orderCol} ${this.orderDir}`;
        }
        if (this.limitCount !== undefined) {
            sql += ` LIMIT ${this.limitCount}`;
        }
        return await exec(sql, this.values);
    }

    async first(): Promise<T | undefined> {
        let sql = `SELECT * FROM "${this.tableName}"`;
        if (this.conditions.length > 0) {
            sql += ` WHERE ${this.conditions.join(' AND ')}`;
        }
        if (this.orderCol) {
            sql += ` ORDER BY ${this.orderCol} ${this.orderDir}`;
        }
        sql += ` LIMIT 1`;
        const rows = await exec(sql, this.values);
        return rows[0];
    }
}
