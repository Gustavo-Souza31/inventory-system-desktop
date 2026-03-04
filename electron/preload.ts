import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
    invoke: (channel: string, data?: unknown) => ipcRenderer.invoke(channel, data),
});
