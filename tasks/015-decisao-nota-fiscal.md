# 015 — Decisão: nota fiscal (NFC-e / NF-e)

- **Status:** bloqueada
- **Agente:** Claude (pesquisa e, se aprovado, implementação); decisão do usuário
- **Branch:** `claude/nota-fiscal`
- **Depende de:** 014 (resultado do piloto)
- **Fase:** 4 — decisões depois do piloto

## Objetivo

Decidir, com base no piloto, se o app vai emitir nota fiscal e de que forma.

## Contexto

- Pequenos lojistas informais não precisam de nota; quem é MEI ou do Simples e vende a consumidor final geralmente precisa de NFC-e.
- Construir emissão própria é caro: exige certificado digital do lojista, regras por estado e manutenção contínua.
- **Bloqueada por:** o piloto dizer se a maioria dos lojistas emite nota.

## O que fazer

1. (Claude) Comparar as opções e custos: (a) integrar com a API do Bling ou do Tiny, que emitem a nota; (b) usar um serviço emissor como Focus NFe ou eNotas, cobrado por mensalidade ou por nota; (c) não emitir e posicionar o app para quem não precisa de nota.
2. (Usuário) Decidir, olhando o resultado do piloto.
3. Se for (a) ou (b): Claude abre tarefas de implementação separadas (cadastro fiscal do produto e da empresa, envio da venda, guarda do XML e do número da nota).

## Arquivos

- Pode criar: `docs/decisao-nota-fiscal.md`

## Fora de escopo

- Implementar a emissão antes da decisão.

## Critérios de pronto

- [ ] Documento comparando as opções, custos e riscos
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
