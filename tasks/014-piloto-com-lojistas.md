# 014 — Piloto com 3 a 5 lojistas

- **Status:** bloqueada
- **Agente:** Usuário (Claude ajuda a preparar o material)
- **Branch:** `claude/piloto-lojistas`
- **Depende de:** 002, 003, 004, 005 (fase 1 concluída)
- **Fase:** 2 — validação

## Objetivo

Colocar o app na mão de poucos lojistas reais, por 2 a 4 semanas, e descobrir o que eles mais pedem antes de investir em novas funcionalidades.

## Contexto

- O que os lojistas pedirem primeiro vale mais do que a lista dos concorrentes. Vale revisar a ordem das tarefas da fase 3 com base no que o piloto mostrar.
- **Bloqueada por:** a fase 1 (suporte, termos, backup, instalador assinado).
- Escolher os lojistas é do usuário.

## O que fazer

1. (Usuário) Escolher 3 a 5 lojistas de perfis diferentes (por exemplo: roupas, mercearia, papelaria).
2. (Claude) Preparar `docs/piloto/roteiro.md`: roteiro de instalação, tarefas de teste (cadastrar 10 produtos, fazer 5 vendas, fazer uma contagem) e perguntas de feedback.
3. (Claude) Preparar `docs/piloto/feedback.md` com tabela: lojista, o que pediu, quantas vezes, gravidade.
4. (Usuário) Acompanhar semanalmente por WhatsApp e registrar o feedback.
5. (Claude) Ao fim, resumir os pedidos e propor a ordem final das tarefas da fase 3 e a decisão das tarefas 015 e 016.

## Arquivos

- Pode criar: `docs/piloto/roteiro.md`, `docs/piloto/feedback.md`
- Não commitar dados pessoais dos lojistas (usar iniciais ou "Lojista A").

## Fora de escopo

- Campanha de divulgação, cobrança durante o piloto.

## Critérios de pronto

- [ ] 3 ou mais lojistas usaram o app por 2 semanas ou mais
- [ ] Feedback registrado e resumido
- [ ] Ordem das tarefas da fase 3 revisada

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
