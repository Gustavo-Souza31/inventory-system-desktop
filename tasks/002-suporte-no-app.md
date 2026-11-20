# 002 — Canal de suporte dentro do app

- **Status:** em revisão
- **Agente:** Gemini Hydrogen
- **Branch:** `gemini/suporte-no-app`
- **Depende de:** —
- **Fase:** 1 — pré-requisitos para abrir ao público

## Objetivo

O lojista encontra, em Configurações, como falar com o suporte (WhatsApp e e-mail) e vê a versão do app.

## Contexto

- `src/pages/Settings.tsx` já existe. A versão do app vem do `package.json` (não altere o arquivo).
- Os contatos reais são decisão do usuário: use uma constante em `src/config/support.ts` com valores
  de exemplo (`suporte@exemplo.com`, `5500000000000`) marcados com `// TODO: usuário define os contatos reais`.

## O que fazer

1. Criar a seção "Ajuda e suporte" em Configurações: botão "Falar no WhatsApp" (abre `https://wa.me/<número>`),
   link "mailto:" e a versão atual do app.
2. Abrir links externos pelo navegador padrão (no Electron não deve abrir dentro da janela do app).

## Arquivos

- Pode alterar: `src/pages/Settings.tsx`, `src/index.css`
- Pode criar: `src/config/support.ts`
- **Não alterar:** `package.json`, `electron/`, `src/database/`

## Fora de escopo

- Chat ao vivo, central de ajuda, abertura de chamados.

## Critérios de pronto

- [ ] `npm run build` passa sem erros
- [ ] Os links abrem fora do app (testar no `npm run electron:dev`)
- [x] Usa só variáveis de `src/index.css`
- [ ] Funciona na largura de celular

---

## Relatório

- Agente: Gemini Hydrogen
- Branch: `gemini/suporte-no-app` (não criado por restrição de terminal nesta sessão; alterações aplicadas no working tree)
- O que foi feito:
  - Criado `src/config/support.ts` com as constantes `SUPPORT_EMAIL` (`suporte@exemplo.com`) e `SUPPORT_WHATSAPP_NUMBER` (`5500000000000`), marcadas com `// TODO: usuário define os contatos reais`, além dos helpers `getWhatsAppSupportUrl()` e `getMailtoSupportUrl()`.
  - Adicionada a seção "Ajuda e suporte" em `src/pages/Settings.tsx` com o botão/link "Falar no WhatsApp" (`https://wa.me/<número>` com `target="_blank" rel="noopener noreferrer"`), o link `mailto:` com o e-mail de suporte e a exibição da versão atual do app lida do `package.json` (`v0.1.6`).
  - Adicionadas as classes `.support-actions` e `.support-version` em `src/index.css` usando apenas variáveis CSS existentes, com ajuste responsivo em `@media (max-width: 700px)` para empilhar os botões em largura de celular.
- Arquivos alterados: `src/config/support.ts` (criado), `src/pages/Settings.tsx`, `src/index.css`, `tasks/002-suporte-no-app.md`
- Como testar:
  1. Rodar `npm run build` para validar TypeScript e bundle Vite.
  2. Abrir o app (`npm run dev` e `npm run electron:dev`), navegar até **Configurações** e rolar até **Ajuda e suporte**.
  3. Verificar se a versão exibida corresponde a `version` em `package.json` (`v0.1.6`).
  4. Clicar em **Falar no WhatsApp** e no link de e-mail para validar abertura no navegador padrão / cliente de e-mail fora da janela do app.
  5. Redimensionar para largura mobile (`<= 700px`) e confirmar que os botões quebram/empilham sem overflow horizontal.
- `npm run build`: não executado (sem permissão de terminal nesta sessão)
- Observações / dúvidas:
  - **Electron (`electron/main.ts`):** Como a tarefa proíbe editar `electron/`, não foi alterado `electron/main.ts`. Atualmente, `createWindow()` usa `contextIsolation: true` e `nodeIntegration: false` sem `webContents.setWindowOpenHandler` (nem `shell.openExternal`). Sem esse handler no processo principal do Electron, links `https://` com `target="_blank"` abrem uma nova janela `BrowserWindow` do próprio Electron em vez do navegador padrão do sistema. O Claude precisa adicionar `setWindowOpenHandler` com `shell.openExternal` em `electron/main.ts` para cumprir integralmente o critério no Electron.
  - **Git / Branch:** Como não há acesso ao terminal nesta sessão, não foi feito `git checkout -b gemini/suporte-no-app` nem commit/push.
