# 005 — Assinar o instalador e validar a atualização automática

- **Status:** bloqueada
- **Agente:** Claude (com ações do usuário)
- **Branch:** `claude/assinatura-e-autoupdate`
- **Depende de:** o usuário obter um certificado de assinatura de código
- **Fase:** 1 — pré-requisitos para abrir ao público

## Objetivo

O instalador abre sem o aviso "o Windows protegeu seu PC" (SmartScreen) e o app se atualiza sozinho.

## Contexto

- Hoje o instalador é gerado sem assinatura (`electron-builder`, log: "no signing info identified").
- `electron-updater` já é dependência; falta validar o ciclo publicar versão → app antigo detecta e atualiza.
- **Bloqueada por:** certificado de assinatura (compra do usuário; opções: certificado OV/EV ou Azure Trusted Signing).
  O usuário escolhe e paga; o Claude configura o build.

## O que fazer

1. (Usuário) Escolher e obter o certificado.
2. (Claude) Configurar a assinatura no `build` do `package.json` e as variáveis de ambiente (nunca commitar o certificado ou senha).
3. (Claude) Publicar duas versões de teste num repositório/release privado e confirmar que a mais antiga atualiza sozinha.
4. (Claude) Documentar o processo de release em `docs/release.md`.

## Arquivos

- Pode alterar: `package.json` (campo `build`), `electron/main.ts`
- Pode criar: `docs/release.md`
- **Não commitar:** certificado, senhas, tokens

## Fora de escopo

- Publicar na Microsoft Store, instalador para Mac ou Linux.

## Critérios de pronto

- [ ] Instalador assinado sem aviso do SmartScreen
- [ ] Atualização automática testada com 2 versões
- [ ] Nenhum segredo no diff

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
