# AGENTS.md — regras para agentes de IA neste repositório

Este arquivo é lido automaticamente pelo Antigravity (Gemini) e pelo OpenCode (DeepSeek).
Leia-o inteiro antes de qualquer tarefa.

## O projeto

**Empacota** — inventário e PDV multiusuário. Electron 33 + React 18 + TypeScript 5.6 + Vite 6,
com Supabase (Auth + Postgres com RLS) acessado direto do renderer via `@supabase/supabase-js`.
Não existe backend próprio nem IPC para dados. Build Android via Capacitor.

| Pasta | Conteúdo |
|---|---|
| `src/pages/` | Uma página por rota (Products, Sales, Reports, ...) |
| `src/components/` | Componentes reutilizáveis (Modal, ConfirmDialog, EmptyState, StatsCard, ...) |
| `src/hooks/` | `useCrud` (CRUD genérico com validação), `useBarcodeScanner` |
| `src/database/` | `supabaseClient`, `auth`, `sql-wrapper` (getAll/insert/updateById/...), `types.ts` |
| `src/utils/` | Helpers puros (backup, import, sku, lowStock, dbErrors, phone) |
| `src/index.css` | Design tokens (variáveis CSS) e estilos globais |
| `supabase/schema.sql` | Schema, constraints, policies de RLS e funções RPC |
| `electron/main.ts` | Processo principal do Electron |
| `tasks/` | Especificações de tarefas (ver abaixo) |

## Comandos

```bash
npm install            # dependências
npm run dev            # app no navegador, http://localhost:5173
npm run electron:dev   # app desktop
npm run build          # tsc + vite build — DEVE passar antes de qualquer push
```

Precisa de um `.env` na raiz (nunca commitar) com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Equipe e papéis

| Agente | Ferramenta | Papel | Pode editar |
|---|---|---|---|
| Claude | Claude Code | Especificação, orquestração, revisão final, integração | Tudo |
| Gemini Hydrogen | Antigravity | Telas | `src/pages/`, `src/components/`, `src/index.css`, `src/hooks/` (só quando a tarefa pedir) |
| Gemini Argon | Antigravity | Revisão independente | **Nada** — só escreve a revisão |
| DeepSeek | OpenCode | Testes de ponta a ponta e trabalho mecânico | `tests/`, `e2e/`, configs de teste, e os arquivos que a tarefa listar |

Regras gerais para todos:

1. **Trabalhe só na tarefa recebida** e só nos arquivos que ela lista. Achou outro problema?
   Anote em "Observações" no relatório, não conserte.
2. **Nunca** mexa em `supabase/schema.sql`, `electron/`, `package.json` (versão/dependências),
   `.github/` ou `android/` sem a tarefa autorizar explicitamente.
3. **Nunca** commite `.env`, chaves, tokens ou dados reais de clientes.
4. Não faça push em `main` nem em branches de outro agente. Não faça force-push.
5. Se a especificação estiver ambígua, pare e pergunte em vez de adivinhar.

## Fluxo de trabalho

1. A tarefa fica em `tasks/NNN-nome.md` (status `aberta`).
2. O agente cria o branch indicado na tarefa a partir de `main` atualizado:
   - Gemini: `gemini/<nome-da-tarefa>`
   - DeepSeek: `deepseek/<nome-da-tarefa>`
3. Implementa, roda `npm run build` (e os testes, se houver) até passar.
4. Preenche a seção **Relatório** no próprio arquivo da tarefa e muda o status para `em revisão`.
5. Commit + push do branch e abra um PR para `main` usando o template.
   O GitHub Actions roda o build automaticamente; com o CI vermelho, corrija antes de pedir revisão.
   O usuário avisa o Claude, que revisa e integra.
6. Revisão do Argon: lê o diff do branch (`git diff main...<branch>`) e escreve em
   `tasks/NNN-nome.review.md` — sem alterar código.

## Convenções de código

- **TypeScript estrito**: sem `any` novo, sem `// @ts-ignore`. Tipos de dados ficam em `src/database/types.ts`.
- **Acesso a dados**: use `sql-wrapper` / `useCrud`; não chame `supabase.from(...)` espalhado pelas páginas.
  Erros de banco passam por `translateDbError` antes de chegar ao usuário.
- **Estilo**: use as variáveis de `src/index.css` (`--bg-*`, `--accent`, `--text-*` etc.) e Open Props.
  Nada de cor hexadecimal solta em componente. Respeite o tema claro/escuro existente.
- **Ícones**: só `lucide-react`.
- **Componentes**: reutilize `Modal`, `ConfirmDialog`, `EmptyState`, `SearchBar`, `StatsCard` antes de criar novos.
- **Texto da interface em português do Brasil**. Comentários de código em português, explicando o *porquê*.
- Layout precisa funcionar na janela desktop e na largura de celular (build Android).

## Mensagens de commit

Em português, no imperativo, curtas: `Adiciona filtro por categoria na tela de produtos`.
Um commit por mudança lógica.

## Formato do relatório (fim de cada tarefa)

```markdown
## Relatório
- Agente: <Gemini Hydrogen | DeepSeek>
- Branch: <nome>
- O que foi feito: ...
- Arquivos alterados: ...
- Como testar: ...
- `npm run build`: passou / falhou (colar erro)
- Observações / dúvidas: ...
```
