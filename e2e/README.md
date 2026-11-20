# Testes de ponta a ponta (Playwright)

Testes de fumaça que abrem o app no navegador (Vite, `http://localhost:5173`).
Não usam o Electron nem o Android.

## Como rodar

```bash
npx playwright install chromium   # uma vez por máquina
npm run test:e2e                  # headless
npm run test:e2e:ui               # modo interativo
```

O Playwright sobe o `npm run dev` sozinho (ou reaproveita um servidor já em 5173).

## Variáveis de ambiente

No `.env` da raiz (que não vai para o git), além das variáveis do Supabase:

```env
E2E_EMAIL=conta-de-teste@exemplo.com
E2E_PASSWORD=senha-da-conta-de-teste
```

Sem essas variáveis, `login.spec.ts` roda normalmente e os testes que precisam de
sessão aparecem como *skipped* ("Defina E2E_EMAIL e E2E_PASSWORD no .env").

## O que cada arquivo testa

| Arquivo | Fluxo | Precisa de credenciais |
|---|---|---|
| `login.spec.ts` | Tela de login carrega | não |
| `navegacao.spec.ts` | Menu lateral navega por todas as telas | sim |
| `venda.spec.ts` | Cadastra produto, vende em dinheiro com troco e confere a baixa do estoque | sim |

Três fluxos ainda dependem de funcionalidades não integradas e ficam sempre com
`test.skip` e o motivo:

- `estoque-baixo.spec.ts` — tarefa 006 (alerta de estoque baixo no Painel)
- `contagem.spec.ts` — tarefa 008 (tela de contagem de estoque)
- `fiado.spec.ts` — tarefa 013 (clientes e fiado)

Ao integrar cada funcionalidade, remover o `test.skip(true, ...)` correspondente e
seguir o roteiro comentado no teste.

## ⚠️ Conta de teste

Use uma conta de teste separada no Supabase, nunca a conta real. Os testes de fluxo
criam produtos e vendas para exercitar o app de verdade. Cada teste apaga o produto
que criou no `finally`; as movimentações da venda caem junto por `ON DELETE CASCADE`.
Se um teste falhar no meio e sobrar dado, procure pelo prefixo `E2E-` em Produtos e
exclua manualmente.

## Relatórios

Falhas geram `test-results/` e `playwright-report/` (ambos no `.gitignore`).
