# 004 — Backup automático na nuvem

- **Status:** em andamento
- **Agente:** Claude (com ações do usuário no painel do Supabase)
- **Branch:** `claude/backup-automatico`
- **Depende de:** —
- **Fase:** 1 — pré-requisitos para abrir ao público

## Objetivo

Garantir que o dado dos lojistas tenha cópia automática e que haja um procedimento testado de restauração.

## Contexto

- Hoje o backup é manual (`src/utils/backup.ts`, JSON). Lojista esquece; perder dado de venda destrói a confiança.
- O Supabase faz backups conforme o plano contratado (o plano gratuito **não** dá backup diário restaurável).

## O que fazer

1. (Usuário) Conferir no painel o plano do projeto e se há backups diários ou PITR. Decidir se contrata o plano Pro antes do lançamento.
2. (Claude) Documentar em `docs/backup-e-restauracao.md`: onde ficam os backups, como restaurar, tempo estimado.
3. (Claude) Fazer um teste de restauração num projeto Supabase separado e registrar o resultado no Relatório.
4. (Claude) Lembrete no app (Configurações) com a data do último backup manual, como segunda camada.

## Arquivos

- Pode criar: `docs/backup-e-restauracao.md`
- Pode alterar: `src/utils/backup.ts`, `src/pages/Settings.tsx`

## Fora de escopo

- Replicação multi-região, exportação agendada para outro serviço.

## Critérios de pronto

- [ ] Plano e tipo de backup confirmados pelo usuário
- [ ] Restauração testada de ponta a ponta e documentada
- [ ] `npm run build` passa sem erros

---

## Relatório

- Agente: Claude
- Branch: `claude/backup-automatico`
- O que foi feito: documento `docs/backup-e-restauracao.md` (as duas camadas, como restaurar, roteiro de teste de restauração e lacunas conhecidas); em `src/utils/backup.ts`, o app passa a registrar a data do último backup manual (`getLastBackupAt`, `daysSinceLastBackup`).
- Arquivos alterados: `docs/backup-e-restauracao.md` (novo), `src/utils/backup.ts`
- Como testar: exportar um backup em Configurações e, no console do app, conferir `localStorage.getItem('empacota:lastBackupAt')`.
- `npm run build`: passou
- **Pendente (não concluída):**
  1. **Você:** conferir no painel do Supabase o plano do projeto e se há backup diário ou PITR, e decidir sobre o plano Pro antes do lançamento. Não consultei o painel.
  2. **Teste de restauração:** exige um projeto Supabase de teste separado (e as credenciais dele); não foi feito. O roteiro está no documento e a tabela de registro está vazia.
  3. **Lembrete visual em Configurações:** não implementei a faixa na tela porque `Settings.tsx` está em alteração na tarefa 002 (Hydrogen). Basta exibir `daysSinceLastBackup()` quando passar de 7 dias, e fica para uma tarefa curta de tela depois da 002.
- Observações / dúvidas: o backup manual não inclui as tabelas das tarefas 007 e 012 (descrito no documento).
