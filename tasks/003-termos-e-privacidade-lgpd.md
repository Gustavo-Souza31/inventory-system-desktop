# 003 — Termos de uso, política de privacidade e aceite (LGPD)

- **Status:** bloqueada
- **Agente:** Claude (texto, banco e lógica); Gemini Hydrogen na tela, depois que o Claude liberar
- **Branch:** `claude/termos-lgpd`
- **Depende de:** decisão do usuário (ver abaixo)
- **Fase:** 1 — pré-requisitos para abrir ao público

## Objetivo

Todo novo lojista lê e aceita os termos de uso e a política de privacidade ao se cadastrar, e o aceite
(data e versão do texto) fica registrado.

## Contexto

- O app guarda vendas, produtos, fornecedores e telefones de clientes de cada lojista: são dados pessoais (LGPD).
- Cadastro em `src/components/Login.tsx`; auth em `src/database/auth.ts`.
- **Bloqueada por:** o texto jurídico deve ser revisado por um profissional. O Claude pode redigir um rascunho,
  mas o usuário decide o texto final, o nome da empresa/responsável e o e-mail do encarregado de dados.

## O que fazer

1. (Claude) Rascunho de `Termos de Uso` e `Política de Privacidade` em `src/legal/*.md` com versão (`2026-01`, etc.).
2. (Claude) Tabela `consentimentos` (user_id, versão, aceito_em) + RLS; migração em `supabase/schema.sql`.
   **Aplicar no Supabase só com autorização do usuário.**
3. (Hydrogen) Caixa de aceite no cadastro com links que abrem os textos num modal; botão desabilitado sem aceite.
4. (Claude) Gravar o aceite após o cadastro.

## Arquivos

- Claude: `supabase/schema.sql`, `src/database/`, `src/legal/`
- Hydrogen: `src/components/Login.tsx`, `src/index.css`

## Fora de escopo

- Exportar ou excluir dados do titular (tarefa futura), banner de cookies (o app não usa cookies de rastreio).

## Critérios de pronto

- [ ] `npm run build` passa sem erros
- [ ] Não é possível cadastrar sem aceitar
- [ ] Aceite registrado com versão e data
- [ ] Texto final aprovado pelo usuário

---

## Relatório

- Agente: Claude (parte do Claude; a caixa de aceite no cadastro é do Hydrogen e ainda não foi feita)
- Branch: `claude/termos-lgpd`
- O que foi feito: **rascunhos** dos Termos de Uso e da Política de Privacidade (`src/legal/*.md`, com os campos a preencher entre colchetes) e `src/legal/index.ts` com a versão `LEGAL_VERSION`; tabela `consents` (versão, data, RLS: só ler e inserir os próprios aceites); o trigger `handle_new_user` grava o aceite a partir do cadastro (a sessão ainda não existe antes de confirmar o e-mail); `register()` em `src/database/auth.ts` aceita o parâmetro opcional `termsVersion` e o envia.
- Arquivos alterados: `supabase/schema.sql`, `src/database/auth.ts`, `src/legal/` (novo)
- Como testar: **migração NÃO aplicada** (precisa da sua autorização). Depois: cadastrar uma conta chamando `register(..., LEGAL_VERSION)` e conferir a linha em `consents`.
- `npm run build`: passou
- **Pendente (por isso a tarefa segue bloqueada):**
  1. **Você:** revisar os textos com um profissional e preencher os campos entre colchetes (nome da empresa/CNPJ, e-mail do encarregado de dados, foro, preço, prazos). Os textos são um ponto de partida, **não** assessoria jurídica.
  2. **Hydrogen:** caixa de aceite no cadastro (`src/components/Login.tsx`) com links que abrem os textos num modal e botão desabilitado sem aceite, chamando `register(..., LEGAL_VERSION)`.
- Observações / dúvidas: o aceite só é gravado para cadastros novos; contas já existentes não têm linha em `consents` e precisariam aceitar num próximo login (tarefa futura, se você quiser).

### Parte do Hydrogen

- Agente: Gemini Hydrogen
- Branch: atual da worktree (sem alteração de branch/commit; comandos de terminal desabilitados)
- O que foi feito: adicionada a caixa de aceite dos Termos de Uso e da Política de Privacidade na tela de cadastro em `src/components/Login.tsx`, com links que abrem `termsOfUse` e `privacyPolicy` (de `src/legal`) no componente `Modal` preservando quebras de linha (`white-space: pre-wrap`); botão de criar conta desabilitado sem o aceite (com estilo `:disabled` em `src/index.css`) e guarda no `handleSubmit`; chamada a `register(email, password, fullName, phone, LEGAL_VERSION)`.
- Arquivos alterados: `src/components/Login.tsx`, `src/index.css`
- Como testar: abrir a tela de login, alternar para "Criar conta", verificar que o botão "Criar conta" inicia desabilitado, clicar em "Termos de Uso" e "Política de Privacidade" para abrir os modais de leitura, marcar a caixa de aceite e confirmar que o botão habilita e o cadastro envia `LEGAL_VERSION`.
- `npm run build`: não executado (execução restrita a leitura e edição de arquivos, sem comandos de terminal)
- Observações / dúvidas: item 2 das pendências no relatório anterior foi implementado na tela; a tarefa permanece `bloqueada` aguardando revisão jurídica dos textos e aplicação da migração no Supabase.
