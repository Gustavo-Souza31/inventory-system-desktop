# 📦 Inventory System Desktop

Sistema de gestão de inventário e ponto de venda (PDV) para desktop, construído com **Electron**, **React**, **TypeScript** e **PostgreSQL (Supabase)**.

![Dashboard](https://img.shields.io/badge/Status-Em%20Desenvolvimento-blueviolet)
![Electron](https://img.shields.io/badge/Electron-33-47848f?logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)

## ✨ Funcionalidades

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
- **Dashboard** — Visão geral com métricas, gráficos e resumo de movimentações
- **Filtros de Período** — Últimos 7 dias, 30 dias, esta semana, este mês
- **Estoque Atual** — Tabela com status (OK / Baixo / Sem estoque)
- **Valor do Inventário** — Breakdown por categoria com percentuais
- **Exportação CSV** — Relatórios exportáveis para planilhas

### Ferramentas
- **Código de Barras / QR Code** — Geração e impressão de etiquetas
- **Histórico de Preços** — Timeline de alterações de preço
- **Backup e Restauração** — Exportar/importar dados em JSON

## 🛠️ Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript |
| Build | Vite 6 |
| Desktop | Electron 33 |
| Banco de Dados | PostgreSQL (via IPC) |
| Ícones | Lucide React |
| Barcode/QR | JsBarcode + QRCode |

## 🚀 Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18+)
- npm

### Instalação

```bash
# Clone o repositório
git clone https://github.com/Gustavo-Souza31/inventory-system-desktop.git
cd inventory-system-desktop

# Instale as dependências
npm install
```

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
# O instalador será criado em ./release/
```

## 📁 Estrutura do Projeto

```
inventory-system-desktop/
├── electron/               # Processo principal do Electron
│   ├── main.ts             # Janela principal e configuração
│   ├── preload.ts          # Bridge de comunicação (IPC)
│   └── ipc-handlers.ts     # Handlers de IPC
├── src/
│   ├── components/         # Componentes reutilizáveis
│   │   ├── Layout.tsx      # Layout principal (sidebar + header)
│   │   ├── Modal.tsx       # Modal genérico
│   │   ├── BarcodeLabel.tsx # Etiqueta com código de barras/QR
│   │   └── ...
│   ├── database/           # Camada de dados (PostgreSQL/IPC)
│   │   ├── types.ts        # Interfaces TypeScript
│   │   ├── sql-wrapper.ts  # Wrapper SQL para IPC
│   │   ├── db.ts           # Handlers do banco de dados
│   │   └── seed.ts         # Dados iniciais de exemplo
│   ├── pages/              # Páginas da aplicação
│   │   ├── Dashboard.tsx   # Painel de controle
│   │   ├── Sales.tsx       # Ponto de Venda (PDV)
│   │   ├── Products.tsx    # Gestão de produtos
│   │   ├── Reports.tsx     # Relatórios com filtros
│   │   └── ...
│   ├── utils/              # Utilitários
│   │   ├── export.ts       # Exportação CSV
│   │   └── backup.ts       # Backup/Restauração
│   ├── App.tsx             # Rotas da aplicação
│   ├── main.tsx            # Ponto de entrada
│   └── index.css           # Design system (dark theme)
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.electron.json
```

## 📄 Licença

Este projeto é de uso pessoal/comercial privado.
