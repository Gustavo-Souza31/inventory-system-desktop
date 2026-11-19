# 004 — Backup automático na nuvem

- **Status:** aberta
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

_(preenchido pelo agente)_

- Agente:
- Branch:
- O que foi feito:
- Arquivos alterados:
- Como testar:
- `npm run build`:
- Observações / dúvidas:
