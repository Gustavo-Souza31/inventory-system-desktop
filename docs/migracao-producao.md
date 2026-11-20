# Migração do banco de produção (perfis, contagem, fiado, termos)

Roteiro para aplicar o `supabase/schema.sql` novo no projeto de **produção**
(`inventory-system`, ref `rrzcyzbresnekpitoyhe`). O schema foi validado no projeto de
teste (`inventory-system-teste`); em produção **nada foi aplicado ainda**.

> Regra: só aplicar com a autorização do dono do projeto, no momento da execução,
> e depois do backup do passo 1.

## 1. Estado de produção (consultado em 2026-11-19, só leitura)

- 8 tabelas antigas, todas com RLS e uma política `<tabela>_owner` cada:
  `categories, suppliers, locations, products, movements, priceHistory, productStock, settings`.
- **Não existem** `profiles`, o gatilho de cadastro, `members`, `customers`, `customerEntries`,
  `stockCounts`, `stockCountItems`, `consents`.
- Única função: `restore_backup` (versão antiga, usa `auth.uid()`, sem checagem de papel).
- Colunas das 8 tabelas idênticas às do `schema.sql` (a migração não altera tabelas existentes).
- Volume: 2 usuários, 2 produtos, 3 movimentações, 1 categoria, 1 fornecedor, 1 configuração.
- Plano **Free**: não há backup diário restaurável.

## 2. O que a migração faz

É o `schema.sql` inteiro, que é idempotente (`IF NOT EXISTS`, `DROP ... IF EXISTS`):

1. Cria as 7 tabelas novas (com RLS).
2. Cria o gatilho `on_auth_user_created` (perfil + aceite dos termos no cadastro).
3. Cria as RPCs: contagem, fiado, equipe (convite/aceite), `my_access`.
4. Troca as políticas `*_owner` das 8 tabelas antigas por políticas por papel
   (dono / gerente / caixa) e passa o `DEFAULT` de `user_id` para `current_owner_id()`.
5. Troca o `restore_backup` por uma versão que usa o dono da loja e exige papel `dono`.
6. Cria os gatilhos que impedem referência entre lojas e limitam o caixa.

**Nenhuma linha existente é alterada ou apagada.** Os 2 usuários atuais continuam donos
dos próprios dados: `current_owner_id()` devolve `auth.uid()` para quem não está em `members`.

**Compatibilidade:** o app antigo (0.1.7) continua funcionando depois da migração para quem
é dono. Por isso a ordem segura é migrar o banco **antes** de distribuir o app novo.

## 3. Passo a passo

### Passo 1 — Backup (obrigatório)

O plano Free não tem backup restaurável. Faça os dois:

1. No app, **Configurações → Exportar Backup** com cada uma das 2 contas (gera o JSON).
   Guarde os arquivos fora do repositório.
2. Anote os números de linhas (abaixo, passo 2) para comparar depois.

Opcional, recomendado antes de abrir para lojistas: assinar o plano Pro por um mês para ter
backup diário (ver `docs/backup-e-restauracao.md`).

### Passo 2 — Foto do "antes"

No SQL Editor de produção, rode e guarde o resultado:

```sql
select
  (select count(*) from auth.users) usuarios,
  (select count(*) from products) produtos,
  (select count(*) from movements) movimentos,
  (select count(*) from categories) categorias,
  (select count(*) from suppliers) fornecedores,
  (select count(*) from locations) locais,
  (select count(*) from "productStock") estoque_local,
  (select count(*) from "priceHistory") historico_preco,
  (select count(*) from settings) configuracoes;
-- Em 2026-11-19: 2, 2, 3, 1, 1, 0, 0, 0, 1
```

### Passo 3 — Aplicar

Aplicar o conteúdo de `supabase/schema.sql` **como uma única migração** (uma transação:
se algo falhar, nada fica pela metade). Duas formas:

- Claude via MCP `apply_migration`, nome `lojistas_perfis_contagem_fiado_termos`, no projeto
  `rrzcyzbresnekpitoyhe` (só com a sua autorização na hora); ou
- você, colando o arquivo no **SQL Editor** do painel e clicando em Run.

Janela sugerida: fora do horário de uso. Leva segundos; as tabelas são pequenas.

### Passo 4 — Verificar

```sql
select
  (select count(*) from pg_tables where schemaname='public') tabelas,                          -- 15
  (select count(*) from pg_tables where schemaname='public' and not rowsecurity) sem_rls,      -- 0
  (select count(*) from pg_policies where schemaname='public') politicas,                      -- 52
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public') funcoes,                                                        -- 20
  has_function_privilege('anon','public.restore_backup(jsonb)','EXECUTE') anon_restore,        -- false
  has_function_privilege('anon','public.add_customer_entry(bigint,text,numeric,text)','EXECUTE') anon_fiado, -- false
  has_function_privilege('authenticated','public.account_has_own_data(uuid)','EXECUTE') auth_interna;        -- false

-- Os dados continuam todos lá: compare com o passo 2.
select (select count(*) from products) produtos, (select count(*) from movements) movimentos,
       (select count(*) from categories) categorias, (select count(*) from suppliers) fornecedores,
       (select count(*) from settings) configuracoes;
```

Esperado: os números da `-- ` acima e as contagens iguais às do passo 2.

### Passo 5 — Teste de fumaça com o app atual

Com o app 0.1.7 (ou o build novo apontando para produção) entre com a sua conta e confira:
produtos e movimentações aparecem, dá para vender 1 item e o estoque baixa, e
**Configurações** continua abrindo. A conta deve aparecer como **Dono**.

Não rode o E2E em produção (ele cria e apaga dados): ele é só para o projeto de teste.

### Passo 6 — Só então distribuir o app novo

Gerar o instalador a partir da `main` (ver `docs/release.md`) só depois dos passos 4 e 5.

## 4. Se algo der errado — rollback

Arquivo: `supabase/rollback-lojistas.sql` (volta às 8 tabelas, políticas `*_owner`,
`DEFAULT auth.uid()` e o `restore_backup` antigo).

- Testado no projeto de teste, dentro de uma transação desfeita de propósito: resultado
  8 tabelas, 8 políticas `*_owner`, só a função `restore_backup`, sem gatilhos.
  O script completo, com o `restore_backup` de 271 linhas extraído do git, não foi
  executado de ponta a ponta; confira-o antes de depender dele.
- **Apaga os dados das tabelas novas** (clientes, fiado, contagens, equipe, aceites, perfis).
  Use só logo após a migração, antes de alguém cadastrar dados nelas. Depois disso,
  corrija para frente em vez de voltar.
- Os dados das 8 tabelas antigas não são tocados pelo rollback.

## 5. Pendências de configuração (fora do SQL)

- **Auth no painel:** conferir "Confirm email", as URLs de redirecionamento e o remetente
  dos e-mails (o SMTP padrão tem limite baixo de envios; para lojistas, configurar SMTP próprio).
- **Textos legais:** o aceite grava a versão `2026-01-rascunho`; trocar pela versão revisada
  antes de abrir cadastros (tarefa 003).
- **Criar usuário pelo painel falha** ("Database error creating new user"): o gatilho exige
  nome e telefone. O cadastro pelo app funciona. Se precisar criar contas pelo painel,
  tornar o gatilho tolerante a campos vazios.
- **Limitação conhecida:** o caixa ainda lê o preço de custo no banco (só a interface o esconde),
  e a venda no PDV ainda não é uma RPC atômica.

## 6. Checklist

- [ ] Backup JSON das 2 contas guardado
- [ ] Contagens do "antes" anotadas
- [ ] Autorização para aplicar em produção
- [ ] Migração aplicada como uma única transação
- [ ] Verificação do passo 4 conferida
- [ ] Teste de fumaça do passo 5 feito
- [ ] Instalador novo gerado só depois
