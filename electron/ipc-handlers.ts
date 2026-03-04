import { ipcMain } from "electron";

export function registerIpcHandlers() {
    ipcMain.handle("greet", (_event, args: { name: string }) => {
        return `Hello, ${args.name}! You've been greeted from Node.js!`;
    });
}
