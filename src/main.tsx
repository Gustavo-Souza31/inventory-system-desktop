import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { logout } from "./database/auth";
import "./index.css";

// Exposto para o menu nativo do Electron (electron/main.ts) chamar o
// logout do Supabase, já que o processo principal não tem acesso direto
// ao cliente supabase-js (ele só existe no renderer).
declare global {
  interface Window {
    __appLogout?: () => void;
  }
}
window.__appLogout = () => { logout(); };

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
