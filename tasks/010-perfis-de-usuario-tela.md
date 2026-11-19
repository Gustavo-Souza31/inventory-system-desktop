# 010 — Perfis de usuário: tela de equipe e menu por papel

- **Status:** aberta
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

_(preenchido pelo agente)_

- Agente:
- Branch:
- O que foi feito:
- Arquivos alterados:
- Como testar:
- `npm run build`:
- Observações / dúvidas:
