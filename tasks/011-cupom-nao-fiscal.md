# 011 — Impressão de cupom não fiscal no PDV

- **Status:** aberta
- **Agente:** Gemini Hydrogen
- **Branch:** `gemini/cupom-nao-fiscal`
- **Depende de:** —
- **Fase:** 3 — funcionalidades para lojistas

## Objetivo

Ao finalizar uma venda, o lojista pode imprimir um comprovante simples (cupom não fiscal) em impressora térmica de 80 mm ou em impressora comum.

## Contexto

- A frente de caixa está em `src/pages/Sales.tsx`. O nome da empresa já aparece no app (commit a402e12); reutilize o mesmo dado.
- Nota: o cupom **não tem valor fiscal**. Deve trazer a frase "Documento sem valor fiscal".
- No Electron, `window.print()` abre o diálogo de impressão do sistema; use CSS `@media print` para formatar.

## O que fazer

1. Componente de cupom (`src/components/Receipt.tsx`): nome da empresa, data e hora, itens (qtd, nome, preço, subtotal), desconto, total, forma de pagamento e troco, e a frase "Documento sem valor fiscal".
2. Após finalizar a venda, botão "Imprimir cupom" (e opção de reimprimir pela lista de vendas).
3. CSS de impressão: largura de 80 mm, fonte monoespaçada, sem menu nem fundo escuro (cores de impressão sempre preto sobre branco).

## Arquivos

- Pode alterar: `src/pages/Sales.tsx`, `src/index.css`
- Pode criar: `src/components/Receipt.tsx`
- **Não alterar:** `src/database/`, `electron/`

## Fora de escopo

- Nota fiscal (tarefa 015), impressão direta em impressora ESC/POS sem diálogo, QR code do PIX.

## Critérios de pronto

- [ ] `npm run build` passa sem erros
- [ ] A pré-visualização de impressão mostra só o cupom, com texto preto sobre branco
- [ ] A frase "Documento sem valor fiscal" aparece
- [ ] Funciona na largura de celular (botão acessível)

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
