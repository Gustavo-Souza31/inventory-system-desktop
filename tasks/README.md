# tasks/

Especificações de tarefas para os agentes. Regras completas em [`../AGENTS.md`](../AGENTS.md).

## Como funciona

- Cada tarefa é um arquivo `NNN-nome-curto.md`, criado a partir de [`_TEMPLATE.md`](_TEMPLATE.md).
- O Claude escreve a especificação; o agente responsável implementa no branch indicado
  e preenche o **Relatório** no final do mesmo arquivo.
- Revisões independentes (Gemini Argon) são respondidas no chat do Antigravity, no formato
  de [`_REVIEW_TEMPLATE.md`](_REVIEW_TEMPLATE.md), e coladas para o Claude.

## Status

| Status | Significado |
|---|---|
| `aberta` | Pronta para o agente pegar |
| `em andamento` | Agente trabalhando |
| `em revisão` | Push feito, aguardando revisão do Claude |
| `concluída` | Integrada em `main` |
| `bloqueada` | Precisa de decisão do usuário ou do Claude |

## Como passar uma tarefa para um agente

Cole no agente:

> Leia `AGENTS.md` e depois `tasks/NNN-nome.md`. Execute a tarefa seguindo as regras,
> preencha o Relatório, rode `npm run build` e faça push do branch indicado.

## Índice

| # | Tarefa | Agente | Status |
|---|---|---|---|
| [001](001-infra-testes-e2e.md) | Infraestrutura de testes E2E (Playwright) | DeepSeek | aberta |
