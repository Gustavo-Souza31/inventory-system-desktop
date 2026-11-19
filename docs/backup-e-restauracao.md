# Backup e restauração

Duas camadas de proteção para os dados dos lojistas. A primeira é do Supabase (automática); a segunda é o backup manual dentro do app.

## 1. Backup automático do Supabase (camada principal)

Os dados ficam no Postgres do Supabase. Quem faz a cópia automática é o próprio Supabase, e **o que está incluído depende do plano**:

| Plano | Backup | Restauração |
|---|---|---|
| Free | Não há backup diário restaurável por você | Não confie nele para dados de clientes |
| Pro | Backup diário, retido por 7 dias | Pelo painel: Database → Backups |
| Pro com PITR (complemento pago) | Ponto no tempo, até o segundo | Pelo painel: Database → Backups → Point in Time |

> Os planos e prazos mudam. **Confirme no painel do projeto (Settings → Billing e Database → Backups) o que o seu plano atual oferece antes do lançamento.** Esta tabela não substitui a página oficial do Supabase.

**Recomendação:** antes de abrir o app a lojistas, usar no mínimo o plano Pro. No plano gratuito um erro, uma migração mal feita ou uma exclusão acidental pode não ter volta.

### Como restaurar pelo painel
1. Painel do Supabase → o projeto → **Database → Backups**.
2. Escolher o backup (ou o ponto no tempo, com PITR) e iniciar a restauração.
3. A restauração **substitui o banco inteiro** pelo estado daquele momento: tudo o que mudou depois é perdido. Avise os usuários antes.
4. Depois de restaurar, abrir o app e conferir produtos, estoque e as últimas vendas.

Tempo: varia com o tamanho do banco (para os volumes de um pequeno lojista, normalmente minutos). Registre aqui o tempo real depois do primeiro teste.

## 2. Backup manual dentro do app (segunda camada)

Em **Configurações → Exportar dados** o app baixa um arquivo `.json` com produtos, categorias, fornecedores, movimentações, locais, estoque por local e histórico de preços. **Importar dados** restaura esse arquivo.

- A restauração é **atômica**: roda numa única transação no banco (função `restore_backup`). Se algo falhar, nada é alterado.
- Ela **substitui** os dados atuais da conta pelos do arquivo; os IDs mudam, mas as relações são preservadas.
- Quando a tarefa 009 (perfis) for aplicada, só o **dono** da loja pode restaurar.
- As tabelas das tarefas 007 (contagem) e 012 (clientes e fiado) **não estão incluídas** no arquivo de backup; ver a seção abaixo.

O app guarda a data do último backup manual neste computador para lembrar o usuário (`getLastBackupAt` em `src/utils/backup.ts`).

## 3. Teste de restauração (a fazer)

Um backup que nunca foi restaurado não é um backup. Roteiro, num **projeto Supabase separado** (nunca no de produção):

1. Criar um projeto de teste e rodar `supabase/schema.sql` inteiro no SQL Editor.
2. Apontar o `.env` do app para o projeto de teste e criar uma conta.
3. Cadastrar alguns produtos, movimentações e um local; exportar o JSON.
4. Apagar os dados (Configurações → Limpar todos os dados) e importar o JSON de volta.
5. Conferir que produtos, estoque, movimentações e histórico de preços voltaram iguais.
6. Registrar abaixo a data, o resultado e o tempo gasto.

| Data | Quem testou | Resultado | Tempo |
|---|---|---|---|
| _(pendente)_ | | | |

## 4. Lacunas conhecidas

- `restore_backup` e o arquivo JSON ainda não cobrem as tabelas de contagem de estoque (`stockCounts`, `stockCountItems`) nem as de clientes e fiado (`customers`, `customerEntries`). Quando essas tarefas forem aplicadas, o backup manual precisa ser estendido para incluí-las, senão restaurar um arquivo antigo deixa essas tabelas de fora.
- O backup manual é feito por quem lembra de fazer. Por isso a camada do Supabase é obrigatória para o lançamento.
