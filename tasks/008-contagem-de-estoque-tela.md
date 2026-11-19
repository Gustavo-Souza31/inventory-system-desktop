# 008 — Contagem de estoque: tela

- **Status:** aberta
- **Agente:** Gemini Hydrogen
- **Branch:** `gemini/contagem-estoque-tela`
- **Depende de:** 007
- **Fase:** 3 — funcionalidades para lojistas

## Objetivo

O lojista abre "Contagem", digita a quantidade contada de cada produto, vê as diferenças e confirma para ajustar o estoque.

## Contexto

- Banco e funções vêm da tarefa 007 (`src/utils/stockCount.ts`, RPC `aplicar_contagem`). Use-as; não acesse tabelas direto.
- Use `Modal`, `ConfirmDialog`, `SearchBar`, `EmptyState`. Rota e item de menu novos em `src/App.tsx` e `src/components/Layout.tsx`.

## O que fazer

1. Página `src/pages/StockCount.tsx`: escolher o local, lista de produtos com campo "contado", coluna de diferença colorida (falta/sobra).
2. Resumo antes de confirmar ("12 itens com diferença") e `ConfirmDialog`.
3. Rota `/contagem` e item no menu.

## Arquivos

- Pode alterar: `src/App.tsx`, `src/components/Layout.tsx`, `src/index.css`
- Pode criar: `src/pages/StockCount.tsx`
- **Não alterar:** `src/database/`, `src/utils/`

## Fora de escopo

- Leitor de código de barras na contagem e histórico de contagens.

## Critérios de pronto

- [ ] `npm run build` passa sem erros
- [ ] Contagem igual ao esperado não gera ajuste
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
