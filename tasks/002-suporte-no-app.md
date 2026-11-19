# 002 — Canal de suporte dentro do app

- **Status:** aberta
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
- [ ] Usa só variáveis de `src/index.css`
- [ ] Funciona na largura de celular

---

## Relatório

_(preenchido pelo agente)_

- Agente:
- Branch:
- O que foi feito:
- Arquivos alterados:
- Como testar:
- `npm run build`:
- Observações / dúvidas:
