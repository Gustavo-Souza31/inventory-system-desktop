import { ipcMain } from "electron";
import { queryDatabase } from "./database";

export function registerIpcHandlers() {
    ipcMain.handle("greet", (_event, args: { name: string }) => {
        return `Hello, ${args.name}! You've been greeted from Node.js!`;
    });

    ipcMain.handle("db:query", async (_event, { text, values }) => {
        try {
            const result = await queryDatabase(text, values);
            return { success: true, rows: result.rows, rowCount: result.rowCount };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });
}

