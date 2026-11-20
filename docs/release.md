# Release do Empacota

Como gerar e publicar uma versão do instalador para Windows, e como ela chega aos usuários.

## Estado atual

| Item | Situação |
|---|---|
| Instalador | NSIS, instalação em um clique, por usuário (`perMachine: false`) |
| Publicação | GitHub Releases do repositório (`publish.provider = github`), criada como **rascunho** (`releaseType: draft`) |
| Atualização automática | `electron-updater` verifica ao abrir o app empacotado e avisa quando baixou ("Reiniciar agora / Depois") |
| Assinatura de código | **Não há.** O build avisa "no signing info identified" e o Windows SmartScreen alerta o usuário |
| `verifyUpdateCodeSignature` | `false` (necessário enquanto não houver assinatura; ver abaixo) |

## Publicar uma versão (hoje, sem assinatura)

1. Aumentar a versão em `package.json` (ex.: `0.1.6` → `0.1.7`). O auto-update só enxerga versões **maiores** que a instalada.
2. Definir o token do GitHub com permissão de escrever releases (nunca no código):
   ```powershell
   $env:GH_TOKEN = "<token>"
   ```
3. Publicar:
   ```bash
   npm run release
   ```
   Isso compila e envia o instalador, o `latest.yml` e o `.blockmap` para um release **rascunho** no GitHub.
4. No GitHub, abrir o rascunho, revisar as notas e **publicar**. Só depois de publicado o app instalado enxerga a atualização.

Para gerar só o instalador local, sem publicar: `npm run electron:build` (sai em `release/`).

## Testar a atualização automática (teste de duas versões)

O auto-update só funciona no app **instalado** (não no `electron:dev` nem no `win-unpacked`), e precisa de um release **publicado** com o `latest.yml`.

1. Instalar a versão A (ex.: 0.1.7), gerada com `npm run electron:build`.
2. Aumentar para a versão B (0.1.8) e rodar `npm run release`; publicar o rascunho no GitHub.
3. Abrir o app instalado (versão A). Deve baixar a B e mostrar "Nova atualização baixada, reinicie o app para aplicar".
4. Reiniciar e conferir a versão no título da janela (`Empacota_<versão>`) e em Configurações → Ajuda e suporte.
5. Registrar o resultado abaixo.

| Data | De → Para | Resultado |
|---|---|---|
| _(pendente)_ | | |

> Para um teste sem expor ao público, use um repositório de testes com release privado ou um canal `prerelease`; o app oficial não deve apontar para ele.

## Assinatura de código (pendente: precisa de certificado)

Sem assinatura, o SmartScreen mostra "O Windows protegeu o seu PC" e muita gente desiste da instalação. A reputação do SmartScreen só se constrói com o tempo e com downloads, mesmo com certificado.

Opções, a decisão e a compra são suas:

| Opção | Observação |
|---|---|
| Certificado OV (validação de organização) | Mais barato; o alerta do SmartScreen some só depois de o certificado ganhar reputação |
| Certificado EV (validação estendida) | Mais caro; reputação imediata no SmartScreen; hoje exige token de hardware ou serviço em nuvem |
| Azure Trusted Signing | Serviço da Microsoft por assinatura mensal; costuma ser o mais simples para CI; verifique se está disponível para o seu país e tipo de cadastro |

Os requisitos e preços mudam; confira nas páginas oficiais antes de decidir.

### O que mudar no projeto quando houver certificado

- Em `package.json` → `build.win`: remover `signAndEditExecutable: false` e configurar a assinatura (arquivo `.pfx` via `CSC_LINK` e `CSC_KEY_PASSWORD` em variáveis de ambiente, ou `azureSignOptions` no caso do Trusted Signing).
- Trocar `verifyUpdateCodeSignature` para `true`, para o app só aceitar atualizações assinadas pelo mesmo publicador.
- Gerar uma versão assinada e fazer o teste de atualização acima de novo (de uma versão assinada para outra).
- **Nunca** commitar o certificado, a senha ou o token. Use variáveis de ambiente locais ou segredos do GitHub Actions.

## Checklist de release

- [ ] `npm run build` e `npm run electron:compile` passam
- [ ] Versão aumentada em `package.json`
- [ ] Testado no app empacotado (`release/win-unpacked/Empacota.exe`)
- [ ] `npm run release` com `GH_TOKEN` na sessão
- [ ] Rascunho revisado e publicado no GitHub
- [ ] Atualização testada a partir da versão anterior instalada
