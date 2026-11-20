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

- Agente: Claude
- Branch: `claude/assinatura-e-autoupdate`
- O que foi feito: revisei a configuração atual (NSIS, publicação em GitHub Releases como rascunho, `electron-updater` com aviso de reinício) e escrevi `docs/release.md` com o passo a passo de publicar uma versão, o roteiro do teste de atualização com duas versões, as opções de assinatura e o que mudar no projeto quando houver certificado.
- Arquivos alterados: `docs/release.md` (novo). Nenhum código nem `package.json` alterado.
- Como testar: ler o roteiro e, quando houver certificado, seguir o teste de duas versões.
- `npm run build`: não aplicável (só documentação)
- **Pendente (a tarefa segue bloqueada):**
  1. **Você:** escolher e comprar o certificado (ou o serviço de assinatura).
  2. **Claude, depois do certificado:** configurar a assinatura em `package.json`, ligar `verifyUpdateCodeSignature` e rodar o teste de duas versões (exige publicar releases no GitHub, o que depende de você autorizar e fornecer o `GH_TOKEN`).
- Observações / dúvidas: hoje o `package.json` tem `verifyUpdateCodeSignature: false` e `signAndEditExecutable: false`; isso é coerente sem certificado e **não deve ser alterado antes de ter um certificado**, ou as atualizações deixam de funcionar. Não publiquei nenhum release nem testei o auto-update, porque isso mexe no GitHub público.
