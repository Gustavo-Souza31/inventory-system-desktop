# 006 — Alerta de estoque baixo no Painel

- **Status:** em revisão
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

- Agente: Gemini Hydrogen
- Branch: `gemini/alerta-estoque-baixo`
- O que foi feito:
  - Em `src/pages/Dashboard.tsx`: atualizado o card **Estoque baixo** com contagem no cabeçalho, link **Ver todos** para `/produtos?filtro=baixo`, ordenação dos 5 itens mais críticos (zerados primeiro, depois menor razão `atual / mínimo` e maior déficit absoluto, reutilizando `isLowStock` e `getLowStockThreshold` de `src/utils/lowStock.ts`), exibição de `nome`, status (`Sem estoque` / `Baixo`) e `atual / mínimo`, clique direto no item levando para `/produtos?filtro=baixo&produto=<id>`, uso de `EmptyState` quando não há alertas, link no `StatsCard` "Estoque Baixo" e grid responsivo (`.dashboard-grid`).
  - Em `src/pages/Products.tsx`: adicionado filtro **Estoque baixo** controlado pelo parâmetro de URL `?filtro=baixo` (`useSearchParams`), botão de alternância com contagem na barra de ferramentas, suporte ao parâmetro `?produto=<id>` para destacar e rolar até o produto vindo do Painel, `EmptyState` específico quando não há produtos com estoque baixo ou filtros ativos, e disparo do evento `empacota:stock-changed` após salvar, importar ou excluir para atualizar o badge lateral.
  - Em `src/components/Layout.tsx`: adicionado badge com a contagem de produtos com estoque baixo no item **Produtos** do menu lateral (reutilizando `getLowStockAlerts` de `src/utils/lowStock.ts`), mantendo o `LowStockModal` ao iniciar a sessão e atualizando a contagem nas navegações e após alterações de produtos.
  - Em `src/index.css`: adicionados estilos com variáveis CSS do tema para `.dashboard-grid`, `.card-header-between`, `.stat-card-link`, `.low-stock-link`, `.low-stock-zero`, `.btn-filter-warning`, `.row-highlight`, `.sidebar-badge`, `.toolbar-select` e ajustes responsivos para largura de tablet (`<= 900px`) e celular (`<= 700px`).
- Arquivos alterados:
  - `src/pages/Dashboard.tsx`
  - `src/pages/Products.tsx`
  - `src/components/Layout.tsx`
  - `src/index.css`
  - `tasks/006-alerta-estoque-baixo.md`
- Como testar:
  1. Cadastrar/editar produtos: um zerado (`quantity = 0`), outros abaixo ou iguais ao mínimo (`minStock` ou `settings.lowStockThreshold`) e pelo menos um OK (acima do mínimo).
  2. Abrir o Painel (`/`): verificar que o card "Estoque baixo" mostra a contagem total, até os 5 piores com `nome` e `atual / mínimo`, e que produtos OK não aparecem.
  3. Clicar em um item da lista do Painel: verificar navegação para `/produtos?filtro=baixo&produto=<id>` com a linha destacada.
  4. Clicar em "Ver todos": verificar navegação para `/produtos?filtro=baixo` listando todos os itens com estoque baixo/zerado e o botão "Estoque baixo" ativo.
  5. Verificar no menu lateral o badge com a contagem no item "Produtos" e testar em largura de celular (`<= 700px`) e tablet (`<= 900px`).
- `npm run build`: não executado (comandos de terminal desabilitados nesta execução; rodar `npm run build` antes do commit/PR).
- Observações / dúvidas:
  - O branch `gemini/alerta-estoque-baixo` ainda precisa ser criado/verificado via git e o `npm run build` executado antes do commit/push, pois comandos de terminal não estavam liberados nesta sessão.
  - Em `Layout.tsx`, vendas ou movimentações feitas em outras telas já atualizam o badge ao navegar entre rotas (`location.pathname`); caso queira atualização em tempo real sem mudar de rota a partir de `Sales.tsx`/`Movements.tsx`, basta disparar `window.dispatchEvent(new Event('empacota:stock-changed'))` nessas páginas ou centralizar em um contexto/hook futuramente.
