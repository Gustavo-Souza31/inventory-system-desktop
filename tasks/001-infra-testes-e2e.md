# 001 — Infraestrutura de testes de ponta a ponta (Playwright)

- **Status:** em revisão
- **Agente:** DeepSeek
- **Branch:** `deepseek/infra-testes-e2e`
- **Depende de:** —

## Objetivo

Ter um comando `npm run test:e2e` que abre o app no navegador e verifica que as
telas principais carregam. Com isso, toda mudança futura pode ser validada de ponta a ponta.

## Contexto

- Hoje o projeto **não tem nenhum teste**. Esta tarefa só cria a estrutura e testes de fumaça;
  **não altera o código do app**.
- O app roda no navegador com `npm run dev` (Vite, porta 5173). Testamos por aí, não pelo Electron:
  é mais simples e cobre a mesma interface React.
- Login usa Supabase Auth (`src/components/Login.tsx`): campos `type="email"` e
  `type="password"` e um botão `type="submit"`.
- Rotas (`src/App.tsx`) e os rótulos do menu lateral (`src/components/Layout.tsx`):

  | Rota | Rótulo no menu |
  |---|---|
  | `/` | Painel |
  | `/vendas` | Vendas |
  | `/produtos` | Produtos |
  | `/categorias` | Categorias |
  | `/fornecedores` | Fornecedores |
  | `/movimentacoes` | Movimentações |
  | `/locais` | Locais |
  | `/relatorios` | Relatórios |
  | `/configuracoes` | Configurações |

## O que fazer

1. Instale `@playwright/test` como **devDependency** (autorizado mexer em `package.json`
   **só** para isso e para os scripts abaixo; não mude a versão do app nem outras dependências).
   Instale apenas o Chromium: `npx playwright install chromium`.
2. Adicione os scripts em `package.json`:
   - `"test:e2e": "playwright test"`
   - `"test:e2e:ui": "playwright test --ui"`
3. Crie `playwright.config.ts` na raiz:
   - `testDir: 'e2e'`, só o projeto `chromium`;
   - `webServer` rodando `npm run dev` em `http://localhost:5173`, com `reuseExistingServer: true`;
   - `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`.
4. Credenciais de teste vêm de variáveis de ambiente **`E2E_EMAIL`** e **`E2E_PASSWORD`**
   (lidas do `.env`, que já está no `.gitignore`). Carregue o `.env` no config sem adicionar
   dependência nova (use `process.loadEnvFile` do Node 22, envolto em try/catch para não quebrar
   quando o arquivo não existir).
5. Crie `e2e/helpers.ts` com uma função `login(page)` que preenche e-mail e senha e espera
   o menu lateral aparecer.
6. Crie os testes:
   - `e2e/login.spec.ts` — **sem credenciais**: a tela de login aparece com campos de
     e-mail, senha e botão de entrar.
   - `e2e/navegacao.spec.ts` — **com credenciais**: faz login, clica em cada item do menu
     (tabela acima), confere que a URL mudou para a rota certa e que **não houve erro no console**
     (`page.on('pageerror')` e `console` com tipo `error`).
     Se `E2E_EMAIL` ou `E2E_PASSWORD` não existirem, o arquivo inteiro faz `test.skip`
     com a mensagem "Defina E2E_EMAIL e E2E_PASSWORD no .env".
7. Adicione ao `.gitignore`: `test-results/`, `playwright-report/`, `playwright/.cache/`.
8. Crie `e2e/README.md` curto: como rodar, quais variáveis definir e o aviso abaixo.

> ⚠️ **Use uma conta de teste separada no Supabase**, nunca a conta real. Os testes desta tarefa
> só navegam (não criam nem apagam dados), mas os próximos vão criar registros.

## Arquivos

- Pode alterar: `package.json` (só devDependency + 2 scripts), `package-lock.json`, `.gitignore`
- Pode criar: `playwright.config.ts`, `e2e/**`
- **Não alterar:** nada em `src/`, `electron/`, `supabase/`, `.github/`, `tsconfig*.json`
  - Se o `tsc` do `npm run build` reclamar dos arquivos de teste, **não** mexa no tsconfig:
    anote em Observações que o Claude ajusta.

## Fora de escopo

- Rodar os testes no GitHub Actions (o Claude integra depois).
- Testes que criam, editam ou excluem dados.
- Testar o Electron ou o Android.

## Critérios de pronto

- [ ] `npm run build` passa sem erros
- [ ] `npm run test:e2e` **sem** `.env` de teste: `login.spec` passa e `navegacao.spec` aparece como *skipped*
- [ ] `npm run test:e2e` **com** `E2E_EMAIL`/`E2E_PASSWORD`: todos passam
- [ ] Nenhum arquivo em `src/` alterado
- [ ] Nenhuma credencial no diff

---

## Relatório

- Agente: DeepSeek
- Branch: `deepseek/infra-testes-e2e`
- O que foi feito:
  - Instalado `@playwright/test` como devDependency e apenas o Chromium (`npx playwright install chromium`).
  - Scripts `test:e2e` e `test:e2e:ui` adicionados ao `package.json`.
  - `playwright.config.ts` com `testDir: 'e2e'`, projeto único `chromium`, `webServer` (`npm run dev`,
    `http://localhost:5173`, `reuseExistingServer: true`), `trace: 'retain-on-failure'` e
    `screenshot: 'only-on-failure'`. O `.env` é carregado com `process.loadEnvFile` dentro de
    try/catch, sem dependência nova.
  - `e2e/helpers.ts` com `login(page)` (preenche e-mail/senha e espera `.sidebar`).
  - `e2e/login.spec.ts` (sem credenciais) e `e2e/navegacao.spec.ts` (com credenciais, percorre os
    9 itens do menu conferindo a rota e falha se houver `pageerror` ou `console` do tipo `error`;
    sem `E2E_EMAIL`/`E2E_PASSWORD` o arquivo inteiro faz skip com a mensagem pedida).
  - `e2e/README.md` curto e as três entradas novas no `.gitignore`.
- Arquivos alterados: `package.json` (devDependency + 2 scripts), `package-lock.json`, `.gitignore`,
  `tasks/001-infra-testes-e2e.md`, `tasks/README.md` (status no índice).
- Arquivos criados: `playwright.config.ts`, `e2e/helpers.ts`, `e2e/login.spec.ts`,
  `e2e/navegacao.spec.ts`, `e2e/README.md`.
- Como testar:
  1. `npx playwright install chromium` (uma vez por máquina).
  2. `npm run test:e2e` — `login.spec` passa e `navegacao.spec` fica *skipped*.
  3. Definir `E2E_EMAIL` e `E2E_PASSWORD` no `.env` (conta de teste!) e rodar `npm run test:e2e`
     de novo — os 2 testes passam.
- `npm run build`: passou (`tsc` + `vite build`, só o aviso já existente de chunk > 500 kB).
- `npm run test:e2e` (sem / com credenciais): sem credenciais: 1 passed, 1 skipped.
  Com credenciais: **não executado** — esta máquina não tem `E2E_EMAIL`/`E2E_PASSWORD` e não há
  conta de teste disponível. Precisa ser confirmado por quem tiver a conta.
- Observações / dúvidas:
  - A worktree não tinha `.env`; copiei o `.env` do repositório principal só para conseguir rodar o
    app (é gitignored e não entrou no diff). Ele não tem variáveis `E2E_*`.
  - O `tsc` não inclui `e2e/` (tsconfig só tem `"include": ["src"]`), então os testes não entram no
    build — nenhum ajuste de tsconfig foi necessário.
  - `navegacao.spec` considera qualquer `console.error` como falha. Se alguma biblioteca passar a
    logar erro esperado (ex.: imagem 404), o teste vai acusar.
