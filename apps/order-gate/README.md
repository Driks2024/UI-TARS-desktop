# ORDER GATE — KG PDF VALIDATOR

Order Gate é um sistema automatizado para validação de pedidos em PDF, aplicando regras comerciais, carimbando aprovações e gerando evidências de rejeição.

## Estrutura do Projeto

- `server`: Backend em Node.js (Fastify, Prisma, SQLite)
- `client`: Frontend em React (Vite, Tailwind)

## Pré-requisitos

- Node.js >= 20
- pnpm

## Como Rodar Localmente

### 1. Backend

1.  Navegue para a pasta do servidor:
    ```bash
    cd apps/order-gate/server
    ```
2.  Instale as dependências:
    ```bash
    pnpm install
    ```
3.  Prepare o Banco de Dados (SQLite):
    ```bash
    pnpm migrate
    ```
4.  Popule o Banco de Dados (Seed):
    ```bash
    pnpm seed
    ```
    *Usuários criados:*
    - Admin: `admin@empresa.com` / `Admin123!`
    - User: `user@empresa.com` / `User123!`
5.  Inicie o servidor:
    ```bash
    npm run dev
    ```
    O servidor rodará em `http://localhost:3000`.

### 2. Frontend

1.  Navegue para a pasta do cliente (em outro terminal):
    ```bash
    cd apps/order-gate/client
    ```
2.  Instale as dependências:
    ```bash
    pnpm install
    ```
3.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
    Acesse em `http://localhost:5173`.

## Funcionalidades

1.  **Login**: Autenticação segura.
2.  **Upload**: Envie PDFs de pedidos (arraste e solte).
3.  **Processamento**: Extração automática de dados e validação de regras (Preço Mínimo, Desconto, Prazos).
4.  **Resultados**: Veja status (APROVADO/REPROVADO) e motivos.
5.  **Downloads**: Baixe o PDF original carimbado ou relatório de evidências.
6.  **Email**: Envie notificações por email para si mesmo.

## Regras de Negócio Implementadas (MVP)

- **Preço Mínimo**: Bloqueia se unit price < min price.
- **Desconto**: Bloqueia se desconto total > 20%.
- **Prazos**: Valida parcelas conforme valor total.
- **Especial 4801**: Regras específicas para prefixo 4801.

## Observações

- O banco de dados é um arquivo SQLite local `dev.db` na pasta `server`.
- Os uploads são salvos na pasta `apps/order-gate/uploads`.
- O envio de email é simulado no console em ambiente de desenvolvimento.

## Deploy no Netlify (Frontend)

Este projeto contém um arquivo `netlify.toml` configurado para deploy do Frontend.

1.  Conecte este repositório ao Netlify.
2.  O Netlify detectará automaticamente as configurações.
3.  **Importante:** O Backend (Node.js + SQLite) **não roda** no Netlify estático. Você precisará hospedar a pasta `apps/order-gate/server` em um serviço como Render, Railway ou Fly.io.
4.  Após hospedar o backend, atualize o arquivo `netlify.toml` substituindo `https://your-backend-url.com` pela URL real do seu backend.
