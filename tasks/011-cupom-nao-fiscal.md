# 011 — Impressão de cupom não fiscal no PDV

- **Status:** em revisão
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

- Agente: Gemini Hydrogen
- Branch: `gemini/cupom-nao-fiscal` (alterações apenas no working tree local; sem commit/branch criado via terminal)
- O que foi feito:
  - Criado o componente `src/components/Receipt.tsx` exibindo nome da empresa (e CNPJ quando configurado), data/hora, número da venda, itens (quantidade, nome, preço unitário, percentual de desconto quando houver e subtotal), subtotal, desconto, total, forma de pagamento, valor pago/troco e a frase "Documento sem valor fiscal".
  - Atualizada a tela `src/pages/Sales.tsx` para capturar o snapshot da venda finalizada, exibir o botão "Imprimir cupom" no modal de sucesso, e adicionar a aba "Vendas Realizadas" (reconstruída a partir das movimentações `Venda #...`) com busca, pré-visualização do cupom em modal e botão "Reimprimir". Também passou a registrar preço unitário e valor pago nas `notes` da movimentação para preservar valores históricos na reimpressão (mantendo compatibilidade com vendas anteriores).
  - Ajustado `src/index.css` com estilos do cupom (80 mm, fonte monoespaçada, texto preto sobre fundo branco), regras de `@media print` ocultando menus/botões/interface do PDV e imprimindo somente `.receipt-print-area` em `@page { size: 80mm auto; margin: 0; }`, além de layout responsivo do PDV e da lista de vendas para largura de celular.
- Arquivos alterados:
  - Criado: `src/components/Receipt.tsx`
  - Alterados: `src/pages/Sales.tsx`, `src/index.css`, `tasks/011-cupom-nao-fiscal.md`
- Como testar:
  1. Em Configurações, preencha o nome da empresa (opcionalmente o CNPJ) e salve.
  2. Acesse **Vendas**, adicione produtos ao carrinho (teste também com desconto e pagamento em Dinheiro informando Valor Pago) e clique em **Finalizar Venda**.
  3. No modal de sucesso, clique em **Imprimir cupom** e confira na pré-visualização de impressão que aparece apenas o cupom em 80 mm, fonte monoespaçada, texto preto sobre fundo branco e a frase "Documento sem valor fiscal".
  4. Acesse a aba **Vendas Realizadas**, clique em **Cupom** para pré-visualizar ou em **Reimprimir** para abrir a impressão diretamente.
  5. Redimensione a janela para largura de celular (~375 px) e verifique que o PDV, os botões do modal e a lista de vendas com o botão **Reimprimir** ficam acessíveis sem rolagem horizontal.
- `npm run build`: não executado (execução de comandos de terminal desabilitada nesta sessão; código verificado por leitura estática).
- Observações / dúvidas:
  - Como não existe tabela separada de vendas no banco, a lista de vendas agrupa os registros de `movements` com `type = 'saida'` e `reason` iniciando em `Venda #`. Vendas antigas gravadas antes desta alteração não possuem `Preço:` e `Pago:` nas `notes`, então a reimpressão usa o preço atual do produto cadastrado como fallback.
  - Nenhum comando git (`checkout -b`, `commit`) ou `npm run build` foi executado devido à restrição de não usar terminal.
