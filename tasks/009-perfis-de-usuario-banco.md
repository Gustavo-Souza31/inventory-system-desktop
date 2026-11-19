# 009 — Perfis de usuário (dono / gerente / caixa): banco e regras

- **Status:** em revisão
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

- Agente: Claude
- Branch: `claude/perfis-de-usuario-banco`
- O que foi feito: modelo em que a **loja é o usuário dono**: todas as linhas já têm `user_id` = dono, então os dados atuais continuam valendo **sem migrar nada**. Tabela `members` (dono → membro, papel `gerente` ou `caixa`); funções `current_owner_id()` e `current_role_name()`; RPCs `my_access`, `add_member`, `set_member_role`, `remove_member` e `list_members`; políticas por papel geradas a partir de uma matriz (select/insert/update/delete separados) e `DEFAULT` de `user_id` passando a ser o dono; trigger que limita o caixa a alterar só a quantidade do produto; `restore_backup` agora usa o dono e só roda para o dono. No front: `src/database/access.ts` e `src/utils/permissions.ts` (mapa de áreas por papel) para a tela da tarefa 010.
- Arquivos alterados: `supabase/schema.sql`, `src/database/access.ts` (novo), `src/utils/permissions.ts` (novo)
- Como testar: **a migração NÃO foi aplicada no Supabase e não foi testada contra um banco** (precisa da sua autorização, de um backup antes e, de preferência, de um projeto Supabase de teste). Depois de aplicar: (1) conta atual continua vendo os próprios dados; (2) criar uma segunda conta, adicionar como caixa pelo `add_member` e conferir que ela vê os dados da loja, vende, mas não cadastra/apaga nem altera preço; (3) uma terceira conta sem vínculo não vê nada da loja.
- `npm run build`: passou
- Observações / dúvidas: (a) **o critério "caixa não lê custo pela API" NÃO foi atendido**: o PDV baixa o estoque no cliente, então o caixa precisa ler `products`; o custo fica oculto só na interface. Fechar isso exige mover a venda para uma RPC e dar ao caixa uma view sem custo (sugestão de tarefa futura). (b) Para entrar numa equipe a pessoa precisa já ter conta e **não** pode ter dados próprios (os dados dela ficariam invisíveis); o convite é por e-mail de uma conta existente, sem envio de convite. (c) As políticas das tabelas das tarefas 007 e 012 só são criadas se elas já existirem: rode o bloco "Políticas por papel" de novo depois de aplicar essas migrações. (d) Um usuário pertence a uma loja só.
