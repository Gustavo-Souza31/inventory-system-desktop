import { ipcMain } from "electron";
import { connectToDatabase, queryDatabase, disconnectDatabase } from "./database";

export function registerIpcHandlers() {
    ipcMain.handle("greet", (_event, args: { name: string }) => {
        return `Hello, ${args.name}! You've been greeted from Node.js!`;
    });

    // Database handlers
    ipcMain.handle("db:connect", async (_event, config) => {
        try {
            await connectToDatabase(config);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("db:query", async (_event, { text, values }) => {
        try {
            const result = await queryDatabase(text, values);
            return { success: true, rows: result.rows, rowCount: result.rowCount };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("db:disconnect", async () => {
        await disconnectDatabase();
        return { success: true };
    });
}

