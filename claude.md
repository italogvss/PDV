# Kashing — Visão Geral

SaaS de gestão para pequenos comércios (repo: `PDV-Ultra`). Foco em simplicidade — interface direta, sem excesso de funcionalidades. Projeto em fase de pré-produção.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + **MUI v9** (+ MUI X) + Vite — React Query, Redux Toolkit, React Hook Form + Zod |
| Backend | ASP.NET Core (.NET 8+) + EF Core + MySQL — arquitetura em camadas (Api / Application / Domain / Infrastructure) |
| Storage | MinIO (S3-compatível, Docker) — upload direto frontend↔MinIO via presigned URL |
| Pagamentos | **Stripe** (Billing + Checkout hospedado) |
| Mobile (futuro) | Capacitor (wrapper do frontend) |

Cada camada tem seu próprio guia detalhado (`frontend/CLAUDE.md`, `backend/CLAUDE.md`) — **leia-o antes de mexer nela**.

## Estrutura

```
/
├── CLAUDE.md
├── docker-compose.yml / docker-compose.prod.yml   ← stack completa local / produção
├── /frontend    ← React + TypeScript + MUI — ver frontend/CLAUDE.md
├── /backend     ← ASP.NET Core + EF Core — ver backend/CLAUDE.md
├── /landingpage ← Astro (site de marketing, plano via ?plano=<slug>)
└── /docs        ← especificações e documentos legais (ver índice abaixo)
```

Ambiente local completo sobe com `docker compose up` na raiz: MySQL (host `3307`), MinIO (`9000`/console `9001`), API (`5000`, `dotnet watch`) e frontend (`5173`, Vite). A API roda migrations + `PlanSeeder` no startup.

---

## Multi-tenant

Banco compartilhado com coluna `TenantId` em todas as entidades de negócio. O `TenantId` vem como claim do JWT e é injetado automaticamente no `AppDbContext` via `ITenantContext` — **nunca passar `TenantId` manualmente em queries**.

O `AppDbContext` aplica `HasQueryFilter` por entidade; o predicado **não é uniforme**:
```csharp
// padrão (maioria): isola por tenant + soft delete
.HasQueryFilter(p => p.TenantId == tenantContext.TenantId && p.IsActive);
// Sale/Expense: só tenant (não usam IsActive dessa forma)
.HasQueryFilter(s => s.TenantId == tenantContext.TenantId);
```

**Entidades SEM filtro de tenant** (ver `OnModelCreating`): as de **cobrança** (`Plan`, `Subscription`, `GatewayCustomer`, `Payment`, `WebhookEvent`) — pertencem ao **Owner (`UserId`)** e o webhook anônimo precisa lê-las sem tenant; e as **globais** (`Announcement`, `UserSeenMarker`). Nesses casos o isolamento por `UserId` é feito **explicitamente nos repositórios**.

**Regra crítica:** `IgnoreQueryFilters()` só com comentário explicando o motivo. Qualquer uso sem justificativa é bug de segurança — dados de um tenant podem vazar para outro.

---

## Autorização (três camadas)

Aplicadas via atributos no controller, de fora para dentro:

1. **`[Authorize]`** — exige JWT válido. `[Authorize(Roles = "Owner,Admin")]` restringe por role.
2. **`[RequireModule(OperationModule.X)]`** — gating de **plano**. Lança `PaymentRequiredException` (**402** `NOT_IN_PLAN`) se o módulo não estiver no plano efetivo do tenant (`IEntitlementService`).
3. **`[RequirePermission(Permission.X)]`** — permissão granular por cargo (`IPermissionService`).

Gating de **limite numérico** (ex.: máx. de produtos) é feito no service com `EnsureWithinLimitAsync(...)` → 402 `PLAN_LIMIT_EXCEEDED`.

**Roles** (`UserRole`): `Owner` (acesso total ao tenant), `Employee` (acesso por permissão do cargo), `Admin` (admin da plataforma — `AdminController`, área `/admin` no frontend).

> **Plano nunca esconde/desabilita UI.** O frontend renderiza normalmente; o backend barra com 402 e o erro vira toast amigável de upgrade. Não confundir gating de plano (billing) com controle de acesso (role/permissão), que esse sim filtra a UI.

---

## Assinaturas / cobrança (Stripe)

Referência de implementação em [docs/subscriptions.md](docs/subscriptions.md). Skill do Stripe em `.claude/skills/stripe-llm.md`; bootstrap de produtos/preços e fixtures de webhook em `.claude/stripe-bootstrap/` e `.claude/webhook-tests/`.

Invariantes centrais:
- **Sem plano Free permanente** — só planos pagos (`PlanSeeder`). Sem assinatura válida, todo módulo gateado → 402.
- **Trial de 30 dias, PDV-side** — controlado pela aplicação, **sem tocar o gateway**. Plano escolhido na landing (`?plano=<slug>`) cria `Subscription` `Trialing` na criação do tenant; uma vez por usuário (`User.HasUsedTrial`).
- **Reembolso 7 dias / retenção 90 dias** — cancelar dentro da janela estorna as cobranças e revoga acesso; a loja **nunca é apagada**, sobrevive para exportação/reassinatura.
- **Upgrade cobra proporcional na hora**; downgrade / redução de ciclo é **agendado** via subscription schedule (sem cobrar). `change-plan/preview` devolve o valor exato.
- **Webhooks `customer.subscription.*` são reconciliação** — datas vêm do evento (nunca `DateTime.UtcNow`); `GatewaySyncedAt` descarta reentregas fora de ordem; `Payment` idempotente por `pi_`/`in_`. Preços vêm da config (`Stripe:Prices:<slug>`), não do código.
- **Exportação de dados fica fora do gate de plano** — é o que permite baixar os dados após cancelamento.

---

## Storage (MinIO) — módulo de mídia (implementado)

Upload **direto frontend↔MinIO** via presigned URL — nunca passa pelo backend. Imagem convertida para `.webp` no navegador antes do PUT. Banco guarda **só o path relativo** (`{tenantId}/{category}/{entityId}.webp`). Detalhes em [.claude/media-module.md](.claude/media-module.md).

Categorias (`MediaCategory`) → bucket de mesmo nome (lowercase):

| Categoria | Bucket | Path | Campo na entidade |
|---|---|---|---|
| `Profile` | `profile` | `{tenantId}/profile/{entityId}.webp` | `User.AvatarUrl` / `Employee.AvatarUrl` |
| `Product` | `product` | `{tenantId}/product/{entityId}.webp` | `Product.ImageUrl` |
| `Service` | `service` | `{tenantId}/service/{entityId}.webp` | (serviço) |
| `Tenant` | `tenant` | `{tenantId}/tenant/{entityId}.webp` | `TenantSettings.LogoUrl` |

Fluxo:
```
Frontend valida + converte p/ WebP
  → GET   /api/media/presigned-url?category=Product&entityId=123   (backend gera PUT, 5 min)
  → PUT   {uploadUrl}   (direto no MinIO, blob .webp)
  → PATCH /api/media/confirm  { category, entityId }   (backend recalcula o path, valida o objeto, atualiza a entidade)
Frontend invalida a query (React Query)
```

Regras:
- Banco armazena apenas o path relativo — nunca a URL completa nem a presigned URL.
- O `relativePath` **nunca vem do cliente** — o `confirm` recalcula via `MediaPathHelper` (evita vazamento cross-tenant).
- Converter para `.webp` antes de salvar; máx. **5MB**; tipos aceitos JPEG/PNG/WebP.
- Presigned URL de leitura já vem resolvida no DTO da entidade, com `?v={UpdatedAt.Ticks}` para cache busting.

---

## Autenticação

JWT em **cookie HttpOnly** (`access_token`); refresh token em cookie separado, guardado no banco como **hash SHA256**. Login **local** (senha hasheada) ou **Google OAuth**. Um usuário pode ter múltiplos tenants (`UserTenant`); `SwitchTenant` reemite o JWT com o `tenantId` trocado. Ver [docs/auth.md](docs/auth.md).

---

## Convenções globais

- Código em inglês, interface e comentários em português brasileiro
- Simplicidade acima de tudo — questionar qualquer abstração antes de criar
- Soft delete via `IsActive = false` — **exceções hard-deleted**: `Expense`, `EmployeeSalaryLink` (cobrança/globais têm regras próprias); nunca deletar fisicamente
- Migrations via EF Core — nunca alterar banco manualmente
- Secrets e connection strings em `.env` / user-secrets — **nunca commitados**

---

## Índice de docs (`/docs`)

| Assunto | Doc |
|---|---|
| Assinaturas / cobrança (Stripe) | [subscriptions.md](docs/subscriptions.md) |
| Controle de acesso e entitlements | [access-control-e-entitlements.md](docs/access-control-e-entitlements.md), [entitlements-e-limits.md](docs/entitlements-e-limits.md) |
| Autenticação | [auth.md](docs/auth.md) |
| Exclusão de conta (LGPD) | [account-deletion.md](docs/account-deletion.md) |
| Anúncios | [announcements-module.md](docs/announcements-module.md) |
| Auditoria matemática de relatórios | [auditoria-matematica-relatorios.md](docs/auditoria-matematica-relatorios.md) |
| Deploy em produção | [deploy-producao.md](docs/deploy-producao.md) |
| Documentos legais | [termos-de-uso-v2.md](docs/termos-de-uso-v2.md), [politica-de-privacidade-v2.md](docs/politica-de-privacidade-v2.md), [pendencias-documentos-legais.md](docs/pendencias-documentos-legais.md) |

---

## O que nunca fazer

- `IgnoreQueryFilters()` sem comentário justificando
- Esquecer de filtrar por `UserId` em repositório de cobrança/global (não há filtro automático)
- `TenantId` hardcoded em query manual
- Path de arquivo sem prefixo `{tenantId}/`
- URL completa/presigned do MinIO no banco — só o path relativo
- Aceitar `relativePath` vindo do cliente no confirm de mídia
- Upload de arquivo passando pelo backend como intermediário
- Esconder/desabilitar UI por causa do **plano** — deixe o backend retornar 402
- Datas de `DateTime.UtcNow` em handler de webhook — sempre do evento
- Delete físico de registro onde há soft delete
- Secrets ou connection strings commitados
