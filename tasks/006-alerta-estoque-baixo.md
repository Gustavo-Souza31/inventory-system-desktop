# 006 — Alerta de estoque baixo no Painel

- **Status:** aberta
- **Agente:** Gemini Hydrogen
- **Branch:** `gemini/alerta-estoque-baixo`
- **Depende de:** —
- **Fase:** 3 — funcionalidades para lojistas

## Objetivo

Ao abrir o app, o lojista vê no Painel quais produtos estão abaixo do estoque mínimo ou zerados,
com um clique para ir até o produto.

## Contexto

- A regra já existe em `src/utils/lowStock.ts` (usa `settings.lowStockThreshold` como fallback). **Reutilize, não reimplemente.**
- `src/pages/Dashboard.tsx` já mostra métricas; `StatsCard` e `EmptyState` já existem em `src/components/`.
- Se precisar de uma função nova em `lowStock.ts`, peça ao Claude em Observações.

## O que fazer

1. Card "Estoque baixo" no Painel: contagem, lista dos 5 piores (nome, atual / mínimo) e link "Ver todos" para `/produtos` filtrado.
2. Filtro "Estoque baixo" na tela de Produtos (parâmetro de URL, ex.: `?filtro=baixo`).
3. Badge com a contagem no item "Produtos" do menu lateral (`src/components/Layout.tsx`).

## Arquivos

- Pode alterar: `src/pages/Dashboard.tsx`, `src/pages/Products.tsx`, `src/components/Layout.tsx`, `src/index.css`
- **Não alterar:** `src/utils/lowStock.ts`, `src/database/`

## Fora de escopo

- Notificação do sistema operacional e e-mail de alerta.

## Critérios de pronto

- [ ] `npm run build` passa sem erros
- [ ] Produto zerado e produto abaixo do mínimo aparecem; produto OK não aparece
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
