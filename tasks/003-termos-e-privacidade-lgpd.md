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

_(preenchido pelo agente)_

- Agente:
- Branch:
- O que foi feito:
- Arquivos alterados:
- Como testar:
- `npm run build`:
- Observações / dúvidas:
