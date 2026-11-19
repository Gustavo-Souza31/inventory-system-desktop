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

Sem essas variáveis, `login.spec.ts` roda normalmente e `navegacao.spec.ts`
aparece como *skipped* ("Defina E2E_EMAIL e E2E_PASSWORD no .env").

## ⚠️ Conta de teste

Use uma conta de teste separada no Supabase, nunca a conta real. Os testes atuais
só navegam (não criam nem apagam dados), mas os próximos vão criar registros.

## Relatórios

Falhas geram `test-results/` e `playwright-report/` (ambos no `.gitignore`).
