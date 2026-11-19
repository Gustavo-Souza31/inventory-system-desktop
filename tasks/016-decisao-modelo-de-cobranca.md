# 016 — Decisão: modelo de cobrança

- **Status:** bloqueada
- **Agente:** Claude (proposta); decisão do usuário
- **Branch:** `claude/modelo-de-cobranca`
- **Depende de:** 014 (resultado do piloto)
- **Fase:** 4 — decisões depois do piloto

## Objetivo

Definir se o app será grátis, pago ou grátis com limite, e como o limite será aplicado.

## Contexto

- Concorrentes oferecem plano grátis (Bling, Odoo, Zoho, Square), então cobrar de cara é difícil.
- Uma estratégia comum é plano grátis com limite (por exemplo, número de produtos) e plano pago que libera perfis de usuário (tarefas 009 e 010), vários locais de estoque e relatórios.
- **Bloqueada por:** o piloto indicar quanto os lojistas aceitam pagar e o que consideram essencial.

## O que fazer

1. (Claude) Propor 2 ou 3 modelos de planos com limites e preço, com base no piloto e nos custos fixos (Supabase, certificado de assinatura, serviço de nota fiscal se houver).
2. (Usuário) Escolher.
3. Se houver cobrança: Claude abre tarefas separadas para o meio de pagamento (por exemplo, Stripe ou Mercado Pago), para o controle de plano e limites no banco e para a tela de assinatura.

## Arquivos

- Pode criar: `docs/decisao-cobranca.md`

## Fora de escopo

- Implementar cobrança antes da decisão.

## Critérios de pronto

- [ ] Documento com os modelos, limites e preços propostos
- [ ] Decisão do usuário registrada

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
