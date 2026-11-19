# 009 — Perfis de usuário (dono / gerente / caixa): banco e regras

- **Status:** aberta
- **Agente:** Claude
- **Branch:** `claude/perfis-de-usuario-banco`
- **Depende de:** 004 (backup confirmado antes de migrar)
- **Fase:** 3 — funcionalidades para lojistas

## Objetivo

Uma loja pode ter vários usuários com papéis: o dono vê tudo, o gerente opera sem mexer na conta e o caixa só vende.

## Contexto

- Hoje cada conta tem dados isolados por `user_id` via RLS. Para vários usuários na mesma loja, o isolamento passa a ser por **loja** (`empresa_id`), com papel por membro.
- É a mudança mais delicada do plano: toca em todas as políticas de RLS. Fazer em branch próprio, com plano de migração dos dados existentes (cada conta atual vira uma loja com seu dono).

## O que fazer

1. Modelo: tabelas `empresas` e `membros` (user_id, empresa_id, papel); migrar as contas atuais.
2. Reescrever as políticas de RLS para usar a empresa e o papel (caixa: sem acesso a custo e relatórios; só vendas e consulta de produto).
3. Convite e remoção de membro (RPC).
4. Atualizar `src/database/` (auth, sql-wrapper, tipos) para carregar empresa e papel do usuário logado.
5. Teste manual de isolamento entre duas lojas e entre papéis.

**Aplicar a migração no Supabase só com autorização do usuário e depois de um backup.**

## Arquivos

- Pode alterar: `supabase/schema.sql`, `src/database/`, `src/utils/`

## Fora de escopo

- Telas (tarefa 010), papéis personalizados e permissões configuráveis por tela.

## Critérios de pronto

- [ ] `npm run build` passa sem erros
- [ ] Dados dos usuários atuais preservados após a migração
- [ ] Caixa não consegue ler custo nem relatórios pela API
- [ ] Loja A não enxerga dados da loja B

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
