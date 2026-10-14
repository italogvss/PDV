# Kashing

Sistema de gestão (PDV) para pequenos comércios, oferecido como SaaS. Reúne vendas, produtos, estoque, clientes, crediário (venda fiado), despesas, funcionários e relatórios em uma interface simples e direta.

- **App:** [app.kashing.com.br](https://app.kashing.com.br)
- **Site:** [kashing.com.br](https://kashing.com.br)

Multi-tenant (um usuário pode ter várias lojas), com controle de acesso por cargo e assinatura via Stripe (trial de 30 dias).

## Como iniciar

Pré-requisito: **Docker** (com Docker Compose).

```bash
cp .env.example .env    # preencha os valores (senhas, JWT_SECRET, chaves do Stripe)
docker compose up
```

| Serviço | Endereço |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:5000 |
| MinIO (console) | http://localhost:9001 |
| MySQL | localhost:3307 |

A API aplica as migrations e popula os dados iniciais (planos, documentos legais) automaticamente ao subir.

Landing page (opcional): `cd landingpage && npm install && npm run dev`.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, TypeScript, MUI, Vite, React Query, Redux Toolkit |
| Backend | ASP.NET Core (.NET 8+), EF Core, MySQL |
| Landing page | Astro |
| Storage | MinIO (dev) / Cloudflare R2 (produção) |
| Pagamentos | Stripe |
| Testes | NUnit + Moq |
| Infra | Docker Compose, Nginx |
