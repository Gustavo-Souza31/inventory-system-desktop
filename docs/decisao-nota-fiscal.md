# Decisão: nota fiscal (NFC-e / NF-e)

Status: **aguardando o resultado do piloto (tarefa 014)** e a sua decisão. Este documento organiza as opções; ele não escolhe por você.

> Preços, regras fiscais e funcionalidades de terceiros mudam. Os pontos abaixo vêm de conhecimento geral e de uma pesquisa de mercado feita em 2026-11; **confirme tudo nos sites oficiais e com um contador antes de decidir.**

## O problema

Comerciantes que vendem ao consumidor final (e não são isentos) normalmente precisam emitir NFC-e; quem vende a empresas emite NF-e. Hoje o Empacota emite só um cupom **sem valor fiscal**. Lojistas que precisam de nota não conseguem usá-lo como sistema único, e isso é o ponto forte de Bling e Tiny.

## Quem precisa de nota?

Depende do enquadramento do lojista (MEI, Simples Nacional etc.) e do estado. A pergunta do piloto "você emite nota? com que frequência?" é o dado que decide. Um contador pode confirmar caso a caso.

## Opções

### A) Integrar com um ERP que emite a nota (Bling ou Tiny/Olist)
O Empacota envia a venda pela API do ERP e ele emite a nota.
- **Vantagens:** menos trabalho; o lojista pode já usar o ERP; o ERP cuida de regras e atualizações fiscais.
- **Desvantagens:** o lojista precisa ter conta e plano no ERP (custo dele); dependência de API de terceiro; sincronizar produtos e estoque nos dois lados pode gerar conflito.

### B) Usar um serviço emissor (ex.: Focus NFe, eNotas, PlugNotas)
O Empacota chama a API do emissor, que faz a comunicação com a SEFAZ.
- **Vantagens:** controle da experiência dentro do app; o lojista não precisa de outro sistema.
- **Desvantagens:** custo mensal ou por nota (a seu cargo ou repassado); cadastro fiscal completo (NCM, CFOP, CST/CSOSN, certificado digital do lojista) dentro do app; é preciso um backend para guardar o certificado e chamar a API com segurança (hoje o app não tem backend próprio).

### C) Não emitir nota
Posicionar o app para quem não precisa de nota (informais, MEI de venda sem emissão obrigatória, pequenos negócios de balcão).
- **Vantagens:** zero custo e zero risco fiscal; foco no que já existe.
- **Desvantagens:** exclui uma parte grande do mercado de lojistas formais.

## Comparação

| | A) ERP (Bling/Tiny) | B) Emissor (Focus NFe etc.) | C) Sem nota |
|---|---|---|---|
| Esforço | Médio | Alto | Nenhum |
| Custo recorrente | Do lojista (ERP) | Seu ou repassado | Nenhum |
| Exige backend | Provavelmente | Sim | Não |
| Risco fiscal | No ERP | Compartilhado | Do lojista |
| Cobre lojista formal | Sim | Sim | Não |

## Recomendação

1. Decidir **depois do piloto**: se menos da metade dos lojistas emite nota, escolher **C** e revisitar quando houver pedido.
2. Se a maioria emite nota, começar por **A (integração com um ERP)** com um lojista piloto antes de investir em **B**, porque A valida a demanda com muito menos código.
3. **B** só faz sentido com demanda comprovada e depois de existir um backend (necessário para guardar certificado e chamar a API de forma segura).

## Se a decisão for A ou B: novas tarefas (a abrir)

- Cadastro fiscal da empresa (regime, CNPJ, inscrição, certificado) e do produto (NCM, CFOP, unidade fiscal).
- Backend mínimo para guardar segredos e chamar a API de nota.
- Envio da venda, guarda do XML e do número da nota, e cancelamento.
- Testes em ambiente de homologação da SEFAZ antes de qualquer nota real.

## Decisão

- [ ] A) Integrar com ERP — qual: ______
- [ ] B) Serviço emissor — qual: ______
- [ ] C) Não emitir nota por enquanto

Data e responsável: ______
