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

### Plano para abrir o app a pequenos lojistas

Fases, em ordem: **1** pré-requisitos → **2** piloto → **3** funcionalidades → **4** decisões depois do piloto.
A fase 3 pode ser reordenada com base no que o piloto mostrar.

**Fase 1 — pré-requisitos para abrir ao público**

| # | Tarefa | Agente | Status |
|---|---|---|---|
| [002](002-suporte-no-app.md) | Canal de suporte dentro do app | Gemini Hydrogen | aberta |
| [003](003-termos-e-privacidade-lgpd.md) | Termos de uso, privacidade e aceite (LGPD) | Claude + Hydrogen | bloqueada |
| [004](004-backup-automatico-supabase.md) | Backup automático na nuvem | Claude + usuário | aberta |
| [005](005-assinar-instalador-e-autoupdate.md) | Assinar o instalador e validar auto-update | Claude + usuário | bloqueada |

**Fase 2 — validação**

| # | Tarefa | Agente | Status |
|---|---|---|---|
| [014](014-piloto-com-lojistas.md) | Piloto com 3 a 5 lojistas | Usuário | bloqueada |

**Fase 3 — funcionalidades para lojistas**

| # | Tarefa | Agente | Status |
|---|---|---|---|
| [006](006-alerta-estoque-baixo.md) | Alerta de estoque baixo no Painel | Gemini Hydrogen | aberta |
| [007](007-contagem-de-estoque-banco.md) | Contagem de estoque: banco e lógica | Claude | aberta |
| [008](008-contagem-de-estoque-tela.md) | Contagem de estoque: tela (depende de 007) | Gemini Hydrogen | aberta |
| [009](009-perfis-de-usuario-banco.md) | Perfis de usuário: banco e regras (depende de 004) | Claude | aberta |
| [010](010-perfis-de-usuario-tela.md) | Perfis de usuário: tela de equipe (depende de 009) | Gemini Hydrogen | aberta |
| [011](011-cupom-nao-fiscal.md) | Impressão de cupom não fiscal | Gemini Hydrogen | aberta |
| [012](012-clientes-e-fiado-banco.md) | Clientes e fiado: banco e lógica | Claude | aberta |
| [013](013-clientes-e-fiado-tela.md) | Clientes e fiado: telas (depende de 012) | Gemini Hydrogen | aberta |
| [017](017-e2e-fluxos-lojista.md) | Testes E2E dos fluxos do lojista (depende de 001) | DeepSeek | bloqueada |

**Fase 4 — decisões depois do piloto**

| # | Tarefa | Agente | Status |
|---|---|---|---|
| [015](015-decisao-nota-fiscal.md) | Decisão: nota fiscal | Claude + usuário | bloqueada |
| [016](016-decisao-modelo-de-cobranca.md) | Decisão: modelo de cobrança | Claude + usuário | bloqueada |
