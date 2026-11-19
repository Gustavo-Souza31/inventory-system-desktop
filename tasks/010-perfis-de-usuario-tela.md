# 010 — Perfis de usuário: tela de equipe e menu por papel

- **Status:** em revisão
- **Agente:** Gemini Hydrogen
- **Branch:** `gemini/perfis-de-usuario-tela`
- **Depende de:** 009
- **Fase:** 3 — funcionalidades para lojistas

## Objetivo

O dono convida e remove membros e define o papel de cada um; cada papel só vê no menu o que pode usar.

## Contexto

- O papel do usuário logado e as RPCs de convite e remoção vêm da tarefa 009, em `src/database/`. Use-os.
- Menu em `src/components/Layout.tsx`; a gestão da equipe vai em Configurações (`src/pages/Settings.tsx`).

## O que fazer

1. Seção "Equipe" em Configurações (só dono): lista de membros com papel, botão convidar (e-mail + papel) e remover com `ConfirmDialog`.
2. Menu lateral filtrado por papel (caixa vê só Vendas e consulta de Produtos).
3. Ocultar colunas de custo e margem para quem não pode vê-las.

## Arquivos

- Pode alterar: `src/pages/Settings.tsx`, `src/components/Layout.tsx`, `src/pages/Products.tsx`, `src/index.css`
- **Não alterar:** `src/database/`, `supabase/`

## Fora de escopo

- Papéis personalizados e log de auditoria.

## Critérios de pronto

- [ ] `npm run build` passa sem erros
- [ ] Caixa não vê itens de menu restritos nem custo
- [ ] Só o dono vê "Equipe"
- [ ] Funciona na largura de celular

---

## Relatório

- Agente: Gemini Hydrogen
- Branch: `gemini/perfis-de-usuario-tela`
- O que foi feito:
  - `src/components/Layout.tsx`: carrega o papel do usuário uma vez ao entrar via `getMyAccess()` (tratando falhas como `'dono'` para compatibilidade com contas antigas), filtra os itens do menu lateral com `canAccess`, redireciona rotas não permitidas para o papel (ex.: `caixa` caindo em `/` vai para `/vendas`), exibe o papel atual no rodapé da barra lateral usando `roleLabel` e compartilha o papel com as rotas filhas via `<Outlet context>` e hook `useRole()`.
  - `src/pages/Settings.tsx`: adiciona a seção **Equipe** visível apenas para o dono (`canManageTeam`), listando membros via `listMembers`, permitindo alterar o papel (`gerente` / `caixa`) via `setMemberRole`, convidar por e-mail e papel em `Modal` via `addMember`, e remover com `ConfirmDialog` via `removeMember`, com tratamento de erros via `translateDbError`.
  - `src/pages/Products.tsx`: oculta a coluna e os dados de **Custo** na tabela, na exportação em PDF e no modal de produto quando `!canSeeCost(role)`, e mantém a tela em modo consulta para o `caixa` (ocultando criação, importação, modelo, edição, exclusão e histórico de preços, além de desativar o scanner de edição rápida).
  - `src/index.css`: adiciona estilos para `.sidebar-user-meta` e para a lista de membros da equipe (`.team-header`, `.team-list`, `.team-member-row`, `.team-member-actions`, `.team-role-select`) com adaptação responsiva para largura de celular (`<= 700px`).
- Arquivos alterados:
  - `src/components/Layout.tsx`
  - `src/pages/Settings.tsx`
  - `src/pages/Products.tsx`
  - `src/index.css`
  - `tasks/010-perfis-de-usuario-tela.md`
- Como testar:
  1. Entrar como **Dono**: confirmar que todos os itens do menu aparecem, a coluna **Custo** aparece em Produtos e a seção **Equipe** aparece em Configurações. Convidar uma conta existente como `caixa` e outra como `gerente`, alterar o papel na lista e remover usando o `ConfirmDialog`.
  2. Entrar como **Gerente**: confirmar que **Configurações** não aparece no menu (e acessar `/configuracoes` redireciona para `/`), enquanto **Custo** continua visível em Produtos.
  3. Entrar como **Caixa**: confirmar que ao entrar o sistema redireciona para **Vendas**, o menu mostra apenas **Vendas** e **Produtos**, e em **Produtos** não há coluna **Custo** (nem no PDF exportado) nem botões de cadastro/edição/exclusão/histórico de preços.
  4. Testar em viewport estreito (ex.: 360px): confirmar que a lista de membros da equipe empilha os controles sem estouro horizontal e a barra lateral móvel continua funcional.
- `npm run build`: não executado (execução de comandos de terminal desabilitada nesta sessão)
- Observações / dúvidas:
  - `Products.tsx` não possuía coluna de margem implementada (apenas `Custo`), então foi ocultado o custo na tabela, na exportação PDF e no modal para quem não tem `canSeeCost(role)`.
  - Como `App.tsx` não está na lista de arquivos autorizados pela tarefa, o papel carregado em `Layout.tsx` é repassado às páginas filhas pelo `context` do `<Outlet />` (`useRole()`), evitando chamadas duplicadas a `getMyAccess()`.
  - Necessário rodar `npm run build` fora desta sessão antes de abrir PR/integrar, conforme regra do repositório.
