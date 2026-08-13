import { contextBridge, ipcRenderer } from "electron";

const ALLOWED_CHANNELS = ["db:query", "greet"];

contextBridge.exposeInMainWorld("electronAPI", {
    invoke: (channel: string, data?: unknown) => {
        if (!ALLOWED_CHANNELS.includes(channel)) {
            return Promise.reject(new Error(`Canal IPC não permitido: "${channel}"`));
        }
        return ipcRenderer.invoke(channel, data);
    },
});
