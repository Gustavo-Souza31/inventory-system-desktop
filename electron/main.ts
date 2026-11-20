import { app, BrowserWindow, Menu, session, dialog, shell } from "electron";
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
    // Mesma cor de --bg-primary: evita o flash branco antes do CSS carregar
    backgroundColor: "#0a0a0a",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  // Links externos (WhatsApp, e-mail de suporte) abrem no navegador/cliente
  // de e-mail padrão do sistema, nunca dentro da janela do app. Só http(s) e
  // mailto são repassados ao sistema; qualquer outro protocolo é ignorado.
  const openExternally = (url: string) => {
    if (/^(https?:|mailto:)/i.test(url)) void shell.openExternal(url);
  };
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // window.open('', '_blank') (about:blank) é usado pela impressão de etiquetas
    // de código de barras: precisa abrir uma janela do próprio app.
    if (!url || url === "about:blank") return { action: "allow" };
    openExternally(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    // Navegação para fora do app (links sem target="_blank", como o mailto:).
    // No dev server o app vive em http://localhost; empacotado, em file://.
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    const isAppUrl = url.startsWith("file:") || (Boolean(devUrl) && url.startsWith(devUrl as string));
    if (!isAppUrl) {
      event.preventDefault();
      openExternally(url);
    }
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

// Clique duplo rápido no .exe (ou abrir de novo com o app já rodando)
// disparava uma segunda instância com sua própria janela empilhada
// exatamente em cima da primeira, na mesma posição — parecia que nada
// tinha acontecido ou que a janela "sumia".
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

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
}
