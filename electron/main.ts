import { app, BrowserWindow, Menu, session, dialog } from "electron";
import path from "path";
import { autoUpdater } from "electron-updater";

let mainWindow: BrowserWindow | null = null;

function setupAutoUpdater() {
  // Sem build assinado (`npm run electron:dev`), não há release publicado
  // pra checar — checar update fora do app empacotado só gera erro de rede.
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;

  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox(mainWindow!, {
        type: "info",
        title: "Atualização disponível",
        message: "Nova atualização baixada, reinicie o app para aplicar.",
        buttons: ["Reiniciar agora", "Depois"],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.on("error", (err) => {
    console.error("Falha ao verificar/baixar atualização:", err);
  });

  autoUpdater.checkForUpdates();
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: "appMenu" as const }] : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
    {
      label: "Sair",
      click: () => {
        mainWindow?.webContents.executeJavaScript("window.__appLogout && window.__appLogout();");
      },
    },
  ];
  return Menu.buildFromTemplate(template);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: `Empacota_${app.getVersion()}`,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  // O <title>Empacota</title> do index.html sobrescreveria o título acima
  // assim que a página carrega, se não bloquearmos esse comportamento padrão.
  mainWindow.on("page-title-updated", (event) => event.preventDefault());

  // Allow fetch() to external URLs (Supabase) from file:// context
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Access-Control-Allow-Origin": ["*"],
        "Access-Control-Allow-Headers": ["*"],
        "Access-Control-Allow-Methods": ["GET,POST,PUT,DELETE,PATCH,OPTIONS"],
      },
    });
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(buildMenu());
  createWindow();
  setupAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
