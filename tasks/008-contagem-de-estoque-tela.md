# 008 — Contagem de estoque: tela

- **Status:** em revisão
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

- Agente: Gemini Hydrogen
- Branch: `gemini/contagem-estoque-tela`
- O que foi feito: criada a tela `src/pages/StockCount.tsx` com seletor de local ("Estoque total" ou locais cadastrados, com confirmação antes de trocar caso já existam quantidades digitadas), busca via `SearchBar`, filtro por status (todos/contados/com diferença/não contados), cards de resumo (`StatsCard`), tabela responsiva (que vira cards empilhados em `<= 700px`), campo "contado" para inteiros `>= 0`, coluna de diferença colorida (sobra em `--success`, falta em `--danger`, igual em neutro), `Modal` de resumo antes da confirmação listando apenas os itens com diferença e campo opcional de observações, e `ConfirmDialog` antes de chamar `saveAndApplyCount`. Adicionada a rota `/contagem` em `src/App.tsx`, item "Contagem" no menu em `src/components/Layout.tsx` e classes `.stock-count-*` em `src/index.css` usando apenas variáveis de tema.
- Arquivos alterados: `src/pages/StockCount.tsx` (novo), `src/App.tsx`, `src/components/Layout.tsx`, `src/index.css`, `tasks/008-contagem-de-estoque-tela.md`
- Como testar: rodar `npm run build` e abrir a rota `/contagem` pelo menu "Contagem". Testar: (1) digitar quantidades iguais, maiores (sobra) e menores (falta) que o esperado e confirmar — itens iguais ao esperado não devem gerar movimentação de ajuste; (2) trocar de local com itens já contados; (3) abrir no viewport de celular (`<= 700px`) para verificar a grade de cartões sem rolagem horizontal.
- `npm run build`: não executado (execução de comandos de terminal desabilitada nesta chamada)
- Observações / dúvidas: `src/database/` e `src/utils/` não foram alterados. A tabela usa os utilitários `loadCountLines`, `lineDifference`, `summarizeCount` e `saveAndApplyCount` de `src/utils/stockCount.ts`. Como o terminal estava bloqueado nesta sessão, ainda é necessário rodar `npm run build` e fazer o commit/push no branch `gemini/contagem-estoque-tela`.
