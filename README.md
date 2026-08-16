# Inventory System Desktop

Sistema de gestão de inventário e ponto de venda (PDV) multiusuário, construído com **Electron**, **React**, **TypeScript** e **Supabase** (autenticação + banco de dados Postgres na nuvem).

![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-bf400d)
![Electron](https://img.shields.io/badge/Electron-33-47848f?logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase)

## Funcionalidades

### Contas de Usuário
- **Login e cadastro** por e-mail/senha via Supabase Auth
- **Dados isolados por conta** — cada usuário só acessa os próprios dados, garantido por Row Level Security no banco (não depende de lógica do app)
- **Mesma conta em qualquer dispositivo** — os dados ficam na nuvem, não presos a um computador

### Gestão de Inventário
- **Produtos** — Cadastro completo com SKU, preço, custo, estoque mínimo e categorias
- **Categorias** — Organização com cores personalizadas
- **Fornecedores** — Cadastro de fornecedores vinculados aos produtos
- **Movimentações** — Registro de entradas e saídas com motivo e observações
- **Locais de Estoque** — Controle de estoque distribuído em múltiplos depósitos/lojas

### Ponto de Venda (PDV)
- **Frente de Caixa** — Interface rápida para vendas
- **Busca por nome ou SKU** — Pesquisa instantânea de produtos
- **Descontos** — Preços com desconto de 10% e 20% pré-calculados
- **Formas de Pagamento** — Dinheiro (com troco), Cartão e PIX
- **Baixa Automática** — Estoque deduzido automaticamente ao finalizar a venda

### Relatórios
- **Dashboard** — Visão geral com métricas e resumo de movimentações
- **Filtros de Período** — Últimos 7 dias, 30 dias, esta semana, este mês
- **Estoque Atual** — Tabela com status (OK / Baixo / Sem estoque)
- **Valor do Inventário** — Breakdown por categoria com percentuais
- **Exportação em PDF** — Relatórios de produtos, movimentações e estoque exportáveis

### Ferramentas
- **Código de Barras / QR Code** — Geração e impressão de etiquetas
- **Histórico de Preços** — Timeline de alterações de preço
- **Backup e Restauração** — Exportar/importar dados em JSON

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript |
| Build | Vite 6 |
| Desktop | Electron 33 |
| Mobile | Capacitor (Android) |
| Autenticação | Supabase Auth |
| Banco de Dados | Supabase (Postgres + Row Level Security) |
| Acesso a dados | `@supabase/supabase-js`, chamado direto do renderer (sem IPC/backend próprio) |
| Ícones | Lucide React |
| Barcode/QR | JsBarcode + QRCode |
| PDF | jsPDF + jspdf-autotable |
| Design tokens | Open Props |

## Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18+)
- npm
- Um projeto no [Supabase](https://supabase.com) (gratuito)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/Gustavo-Souza31/inventory-system-desktop.git
cd inventory-system-desktop

# Instale as dependências
npm install
```

### Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Crie um arquivo `.env` na raiz do projeto com as credenciais do seu projeto (Settings → API):
   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-publishable/anon
   ```
3. No **SQL Editor** do painel do Supabase, cole e rode o conteúdo de `supabase/schema.sql` — ele cria as tabelas, as constraints e as policies de Row Level Security que isolam os dados por usuário.

### Desenvolvimento

```bash
# Modo navegador (desenvolvimento rápido)
npm run dev
# Acesse http://localhost:5173

# Modo Electron (app desktop)
npm run electron:dev
```

### Build para Produção

```bash
# Gerar instalador Windows (.exe)
npm run electron:build
# O instalador e a versão "unpacked" ficam em ./release/

# Gerar build Android (via Capacitor)
npm run android:sync
npm run android:open   # abre o projeto no Android Studio
```

## Estrutura do Projeto

```
inventory-system-desktop/
├── electron/                   # Processo principal do Electron
│   └── main.ts                 # Janela principal, menu nativo e configuração
├── android/                    # Projeto Android gerado pelo Capacitor
├── supabase/
│   └── schema.sql              # Schema, constraints e policies de RLS
├── src/
│   ├── components/             # Componentes reutilizáveis
│   │   ├── Layout.tsx          # Layout principal (sidebar + header)
│   │   ├── Login.tsx           # Tela de login/cadastro (Supabase Auth)
│   │   ├── Modal.tsx           # Modal genérico
│   │   ├── BarcodeLabel.tsx    # Etiqueta com código de barras/QR
│   │   └── ...
│   ├── database/
│   │   ├── supabaseClient.ts   # Cliente supabase-js
│   │   ├── auth.ts             # Login, cadastro, sessão
│   │   ├── sql-wrapper.ts      # getAll/getById/insert/updateById/deleteById via supabase-js
│   │   ├── types.ts            # Interfaces TypeScript
│   │   └── seed.ts             # Dados de exemplo (opcional)
│   ├── pages/                  # Páginas da aplicação
│   │   ├── Dashboard.tsx       # Painel de controle
│   │   ├── Sales.tsx           # Ponto de Venda (PDV)
│   │   ├── Products.tsx        # Gestão de produtos
│   │   ├── Reports.tsx         # Relatórios com filtros
│   │   └── ...
│   ├── utils/
│   │   └── backup.ts           # Backup/Restauração (JSON)
│   ├── App.tsx                 # Rotas e checagem de sessão
│   ├── main.tsx                # Ponto de entrada
│   └── index.css               # Design tokens e estilos globais
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.electron.json
```

## Licença

Este projeto é de uso pessoal/comercial privado.
