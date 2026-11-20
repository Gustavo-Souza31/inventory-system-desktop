# Decisão: modelo de cobrança

Status: **aguardando o resultado do piloto (tarefa 014)** e a sua decisão. Este documento propõe modelos; os valores são hipóteses para você validar com os lojistas, não recomendações de preço.

> Os valores de concorrentes vêm de uma pesquisa de mercado de 2026-11 (agregadores e páginas dos fornecedores, com números que variam entre fontes). **Confirme nos sites oficiais antes de usar como referência.**

## Contexto do mercado

- Há planos gratuitos relevantes: Bling (grátis com limite de notas), Odoo (um app grátis), Zoho Inventory e Square (planos grátis). Cobrar logo de início é difícil sem um diferencial claro.
- Planos pagos pesquisados começam na faixa de dezenas de reais ou de poucas dezenas de dólares por mês (ex.: Tiny PDV a partir de cerca de R$ 49/mês; Zoho e Odoo a partir de US$ 25 a 40/mês; Sortly a partir de US$ 24).
- Conclusão: para pequenos lojistas brasileiros, uma mensalidade na faixa baixa dessas referências é o teto realista; abaixo disso há concorrente grátis.

## Custos fixos a cobrir

| Item | Observação |
|---|---|
| Supabase | Plano Pro é o mínimo recomendado para ter backup diário (valor mensal a confirmar no site) |
| Certificado de assinatura do instalador | Custo anual a confirmar |
| Serviço de nota fiscal | Só se a tarefa 015 escolher A ou B |
| Suporte | Seu tempo; considere isso no preço |
| Meio de pagamento (Stripe, Mercado Pago etc.) | Taxa por transação |

Some esses custos e divida pelo número de lojistas que pretende ter para saber o preço **mínimo** sustentável.

## Modelos propostos

### 1. Grátis com limite (freemium)
- **Grátis:** até N produtos (ex.: 100), 1 usuário, 1 local de estoque, relatórios básicos.
- **Pago:** produtos ilimitados, vários usuários e perfis (tarefas 009 e 010), vários locais, contagem de estoque, relatórios em PDF.
- Bom para crescer rápido; exige controle de limite no banco.

### 2. Assinatura única simples
- Uma mensalidade com tudo incluído, com período de teste (ex.: 30 dias).
- Mais simples de explicar e de implementar; perde quem só aceita grátis.

### 3. Por usuário
- Preço por operador de caixa adicional (o dono incluído).
- Alinha o preço ao valor para quem tem equipe; complica para quem tem uma pessoa só.

## Comparação

| | Freemium | Assinatura única | Por usuário |
|---|---|---|---|
| Facilidade de adoção | Alta | Média | Média |
| Simplicidade técnica | Média | Alta | Média |
| Previsibilidade de receita | Média | Alta | Média |
| Risco | Muitos usuários grátis que não pagam | Barreira de entrada | Percepção de "cobrar por tudo" |

## Recomendação

Depois do piloto, com os números de "quanto pagaria" e "em que ponto acha caro" (ver `docs/piloto/feedback.md`):

1. Começar com o **modelo 1 (freemium)** se os lojistas disserem que não pagariam logo de início, usando **perfis de usuário e vários locais** como o que é pago, porque são o que mais separa o lojista pequeno do que tem equipe.
2. Cobrar por **assinatura única (modelo 2)** se a maioria disser que pagaria pelo que já existe.
3. **Não cobrar nada** até o piloto terminar e a Fase 1 estar pronta, e nunca antes de ter backup real (Supabase Pro) e instalador assinado.

## Se a decisão envolver cobrança: novas tarefas (a abrir)

- Escolha do meio de pagamento e criação de produtos/planos.
- Tabela de assinaturas e limites no banco, com a verificação no servidor (não só na interface).
- Tela de plano e cobrança, e tratamento de inadimplência (o que acontece com os dados se parar de pagar: nunca apagar sem aviso e sem prazo para exportar).
- Termos de uso atualizados com preço e cancelamento (tarefa 003).

## Decisão

- [ ] Freemium — limites: ______
- [ ] Assinatura única — preço: ______
- [ ] Por usuário — preço: ______
- [ ] Sem cobrança por enquanto

Data e responsável: ______
