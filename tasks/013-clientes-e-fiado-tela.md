# 013 — Clientes e venda fiado: telas

- **Status:** em revisão
- **Agente:** Gemini Hydrogen
- **Branch:** `gemini/clientes-fiado-tela`
- **Depende de:** 012
- **Fase:** 3 — funcionalidades para lojistas

## Objetivo

O lojista cadastra clientes, vende "fiado" no PDV escolhendo o cliente e registra pagamentos do que o cliente deve.

## Contexto

- Banco e lógica vêm da tarefa 012 (`src/utils/customerBalance.ts` e RPCs). Use-os; não acesse tabelas direto.
- Padrão de página com CRUD: veja `src/pages/Suppliers.tsx` e o hook `useCrud`.

## O que fazer

1. Página `src/pages/Customers.tsx`: lista com nome, telefone e saldo devedor; modal de cadastro e edição; detalhe do cliente com histórico de lançamentos e botão "Registrar pagamento".
2. No PDV (`src/pages/Sales.tsx`), forma de pagamento "Fiado": seletor de cliente (com busca e "novo cliente").
3. Rota `/clientes` e item no menu.

## Arquivos

- Pode alterar: `src/App.tsx`, `src/components/Layout.tsx`, `src/pages/Sales.tsx`, `src/index.css`
- Pode criar: `src/pages/Customers.tsx`
- **Não alterar:** `src/database/`, `src/utils/`

## Fora de escopo

- Juros, multa, envio de cobrança por WhatsApp.

## Critérios de pronto

- [ ] `npm run build` passa sem erros
- [ ] Venda fiado sem cliente selecionado não finaliza
- [ ] Saldo do cliente atualiza após venda e após pagamento
- [ ] Funciona na largura de celular

---

## Relatório

- Agente: Gemini Hydrogen
- Branch: `gemini/clientes-fiado-tela` (edições aplicadas na worktree atual; troca/criação de branch e commit não executados por restrição de terminal)
- O que foi feito:
  - Criada a página `src/pages/Customers.tsx` usando `useCrud`, `getCustomerBalances`, `getCustomerEntries`, `registerPayment`, `formatPhoneBR` e `translateDbError`, com cards de resumo, busca por nome/telefone, filtro de clientes com saldo devedor, tabela no desktop e cartões responsivos no celular, modal de cadastro/edição, validação antes de excluir cliente com histórico e modal de detalhes com histórico de lançamentos e formulário de registro de pagamento (com opção de quitar o saldo total).
  - Atualizada a página `src/pages/Sales.tsx` adicionando a forma de pagamento `"Fiado"`, seletor de cliente com busca por nome/telefone, modal rápido de `"Novo cliente"` (já selecionando o cliente criado), bloqueio de finalização sem cliente selecionado ou com valor <= 0, chamada a `registerFiado(clienteId, total, resumo)` após a baixa de estoque e movimentações, exibição do novo saldo no modal de sucesso e classes responsivas para largura de celular.
  - Adicionada a rota `/clientes` em `src/App.tsx` e o item `"Clientes"` no menu e mapa de títulos em `src/components/Layout.tsx`.
  - Adicionados estilos responsivos em `src/index.css` para o PDV (`.sales-layout`, `.sales-products`, `.sales-cart`, `.sales-stats`, `.sales-payment-methods`, `.sales-payment-section`), para a listagem mobile de clientes (`.customers-desktop-table`, `.customers-mobile-list`) e empilhamento de `.form-row` em telas estreitas.
- Arquivos alterados: `src/pages/Customers.tsx` (novo), `src/pages/Sales.tsx`, `src/App.tsx`, `src/components/Layout.tsx`, `src/index.css`, `tasks/013-clientes-e-fiado-tela.md`.
- Como testar:
  1. Rodar `npm run build` e `npm run dev`.
  2. Acessar `/clientes`, cadastrar um cliente (com telefone formatado), editar seus dados e verificar que aparece com saldo R$ 0,00.
  3. No PDV (`/vendas`), adicionar produtos ao carrinho, selecionar pagamento `"Fiado"` e tentar finalizar sem cliente selecionado: deve bloquear e exibir erro.
  4. Testar o botão `"Novo cliente"` direto no PDV, verificar que o cliente criado é selecionado automaticamente e finalizar a venda; confirmar que o estoque baixou, as movimentações foram criadas e o saldo do cliente aumentou.
  5. Voltar em `/clientes`, abrir os detalhes do cliente, conferir o lançamento `"Fiado"` no histórico, clicar em `"Registrar pagamento"`, pagar parte ou o total e verificar a atualização do saldo e do histórico.
  6. Reduzir a largura da janela para ~375px (celular) e verificar `/clientes` e `/vendas`.
- `npm run build`: não executado (comandos de terminal desabilitados nesta execução; validar antes do merge).
- Observações / dúvidas:
  - Como os comandos de terminal estão desabilitados nesta execução, não foi possível criar/trocar para o branch `gemini/clientes-fiado-tela`, rodar `npm run build` nem fazer commit.
  - `src/database/` e `src/utils/` não foram alterados.
