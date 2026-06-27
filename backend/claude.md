# PDV-Ultra — Backend

API REST em ASP.NET Core (.NET 8+). Multi-tenant com `TenantId` via claim do JWT.

## Estrutura de projetos

```
/backend
├── PDV.Api             ← Controllers, Attributes, Middleware, Program.cs (composition root)
├── PDV.Application     ← Interfaces, DTOs, Validators (FluentValidation), Helpers
├── PDV.Domain          ← Entidades, Enums, Exceptions, Constants, Interfaces (repositórios)
└── PDV.Infrastructure  ← Services, Repositories, AppDbContext, Storage, Migrations
```

**Domain** — entidades, enums, exceções (`AppException` e filhos), constantes (catálogo de planos/módulos) e **interfaces de repositório**. Zero dependência externa.

**Application** — interfaces de service, DTOs de entrada/saída, validators FluentValidation, helpers. Depende só do Domain.

**Infrastructure** — implementa services e repositórios, `AppDbContext`, storage, gateway de pagamento. Depende de Application e Domain.

**Api** — controllers finos (recebe → chama service → retorna), atributos de autorização, `ExceptionMiddleware`. Sem lógica de negócio. Tudo é registrado em `Program.cs`.

> Nota: interfaces de **repositório** ficam em `PDV.Domain/Interfaces`; interfaces de **service** em `PDV.Application/Interfaces`.

---

## Multi-tenant

`TenantId` vem do claim `"tenantId"` do JWT, lido via `ITenantContext` (← `IHttpContextAccessor`). O usuário atual vem via `IUserContext` (`UserId`).

O `AppDbContext` aplica `HasQueryFilter` por entidade. O predicado **não é uniforme** — varia conforme o ciclo de vida:
```csharp
// padrão (maioria): isola por tenant + soft delete
.HasQueryFilter(p => p.TenantId == tenantContext.TenantId && p.IsActive);
// Sale e Expense: só tenant (Sale usa SaleStatus; Expense é hard-deleted) — IsActive nunca muda
.HasQueryFilter(s => s.TenantId == tenantContext.TenantId);
```

**Entidades SEM filtro de tenant** (ver comentários no `OnModelCreating`):
- **Cobrança** — `Plan`, `Subscription`, `GatewayCustomer`, `Payment`, `WebhookEvent`. A assinatura pertence ao **Owner (`UserId`)** e cobre todas as lojas dele; o webhook (anônimo) precisa lê-las sem tenant context. Isolamento por `UserId` é feito **explicitamente nos repositórios**.
- **Globais** — `Announcement` (compartilhado entre tenants) e `UserSeenMarker` (scoped por `UserId`, filtrado nos repositórios).

Regras:
- `IgnoreQueryFilters()` só com comentário justificando — vazamento entre tenants
- Nunca passar `TenantId` manualmente — sempre via `ITenantContext`
- Para entidades de cobrança, **sempre filtrar por `UserId`** no repositório (não há filtro automático)

---

## Autorização

Três camadas, aplicadas via atributos no controller (de fora para dentro):

1. **`[Authorize]`** — exige JWT válido. `[Authorize(Roles = "Owner,Admin")]` restringe por role.
2. **`[RequireModule(OperationModule.X)]`** — gating de plano. Resolve o plano efetivo do tenant e lança `PaymentRequiredException` (**402**) se o módulo não estiver incluído. Implementado por `IEntitlementService`.
3. **`[RequirePermission(Permission.X)]`** — permissão granular por cargo. Implementado por `IPermissionService`.

Roles (`UserRole`): **`Owner`** (acesso total ao tenant — `PermissionService` o libera sem checar permissões), **`Employee`** (acesso por permissão do cargo), **`Admin`** (admin de plataforma, `AdminController`).

Permissões granulares: o `Employee` tem um `RoleId` (`TenantRole`); `roleRepository.HasPermissionAsync(roleId, permission)` decide. Enums em `PDV.Domain/Enums`: `Permission` (ex.: `ViewStock`, `ManageStock`) e `OperationModule` (`Sales`, `Inventory`, `Services`, `Appointments`, `Expenses`, `Reports`, `Customers`, `Suppliers`, `Logs`).

Exemplo típico de controller:
```csharp
[Authorize]
[RequireModule(OperationModule.Inventory)]
public class ProductsController(...) {
    [HttpGet][RequirePermission(Permission.ViewStock)]    ...
    [HttpPost][RequirePermission(Permission.ManageStock)] ...
}
```

---

## Assinaturas / cobrança

Plano **Free** (default, sem assinatura — módulos/limites em `FreePlanDefaults`) + planos pagos (`Plan`, semeados por `PlanSeeder` no startup). Catálogo em `PDV.Domain/Constants` (`ModuleCatalog`, `PlanLimits`, `PlanSeedData`, `SegmentModuleDefaults`).

- `IEntitlementService.ResolveForCurrentTenantAsync()` resolve o plano efetivo **via o Owner do tenant** → sua `Subscription` viva. `IsEntitled` cobre `Trialing` (até `TrialEndsAt`) e `Active`/`Canceled` (até `CurrentPeriodEnd`).
- Gating de **módulo**: `RequireModuleAsync` → 402 `MODULE_NOT_IN_PLAN`.
- Gating de **limite numérico**: o **service** chama `EnsureWithinLimitAsync(limitKey, currentCount)` antes de criar (ex.: `ProductService` checa `PlanLimits.MaxProducts`) → 402 `PLAN_LIMIT_EXCEEDED`.
- Módulos/limites são armazenados como JSON no `Plan` (`EntitledModulesJson`, `LimitsJson`), lidos via `PlanJson` helper.

**Gateway: AbacatePay** (`Services/Payments/AbacatePay`). `IPaymentGateway` cria cobranças; `IPaymentWebhookProcessor` valida e parseia webhooks. `WebhooksController` (`POST /api/webhooks/abacatepay`, anônimo): valida secret na URL → valida HMAC do corpo raw → checa idempotência (`WebhookEvent`) → `BillingWebhookService.ProcessAsync` aplica estado + registra evento num **único `SaveChanges` atômico**.

---

## Banco local & Docker

Stack completa sobe via `docker compose up` (raiz): MySQL, MinIO, API (`dotnet watch`, hot reload) e frontend (Vite). Portas no host: **MySQL `3307`** (→3306), MinIO `9000`/console `9001`, API `5000` (→8080), frontend `5173`.

Na inicialização (`Program.cs`), a API roda `db.Database.Migrate()` + `PlanSeeder.SeedAsync()` automaticamente.

Para criar/aplicar migrations **pelo host**, o `dotnet ef` precisa conectar ao banco (`ServerVersion.AutoDetect`) — apontar para a porta 3307:
```bash
# da pasta /backend
DB_CONNECTION_STRING="Server=127.0.0.1;Port=3307;Database=pdv-ultra;User=root;Password=admin" \
  dotnet ef migrations add NomeDaMigration -p PDV.Infrastructure -s PDV.Api

DB_CONNECTION_STRING="...porta 3307..." dotnet ef database update -p PDV.Infrastructure -s PDV.Api
```
Migrations design-time usam `AppDbContextFactory` com `DesignTimeTenantContext` (`TenantId = Guid.Empty`). Credenciais e segredos em `.env` na raiz — nunca commitar.

---

## Autenticação

JWT em **cookie HttpOnly** (`access_token`); refresh token em cookie separado, armazenado no banco como **hash SHA256** (nunca o valor raw). O JWT chega pelo cookie via `JwtBearerEvents.OnMessageReceived` (não pelo header `Authorization`). `OnChallenge`/`OnForbidden` retornam Problem Details 401/403.

Claims: `sub`→userId, `tenantId`→tenant ativo (pode ser vazio), `name`, `role` (mapeado para `ClaimTypes.Role` via `RoleClaimType`), `jti`.

Login: **local** (`LocalAuth`, senha hasheada) ou **Google OAuth** (`ExternalAuth` + `IOAuthProvider`/`GoogleOAuthProvider`). Um usuário pode ter múltiplos tenants (`UserTenant`); o ativo é `User.LastTenantId`; `SwitchTenant` reemite o JWT com o `tenantId` trocado.

---

## Convenções de entidade

Toda entidade de negócio herda de `BaseEntity` (`Id`, `IsActive`, `CreatedAt`, `UpdatedAt`). Entidades com tenant adicionam `public Guid TenantId`. Entidades de ligação pura (`UserTenant`, `TenantRolePermission`) **não** herdam `BaseEntity`.

Soft delete via `IsActive = false` — **exceções hard-deleted**: `Expense`, `EmployeeSalaryLink` (e cobrança/globais têm regras próprias). Configuração de mapeamento por entidade em `PDV.Infrastructure/Persistence/Configurations/`.

---

## Convenções de Service

Um service por entidade, em `PDV.Infrastructure/Services/`. Padrão interno:
1. `await validator.ValidateAndThrowAsync(request)` (quando há entrada)
2. Buscar entidade → `NotFoundException` se ausente
3. Validar regra → `BusinessException`; checar limite de plano → `entitlementService.EnsureWithinLimitAsync(...)`
4. Mapear para DTO via método `Map` privado (estático, **ou `async`** quando precisa resolver presigned URL de imagem)

Nunca retornar entidade do domínio — sempre DTO. Mutações relevantes registram auditoria via `IAuditLogger` (ver abaixo).

---

## Convenções de Repositório

Em `PDV.Infrastructure/Repositories/`, interface em `PDV.Domain/Interfaces/`.
- Cada repositório chama `SaveChangesAsync` internamente — não há Unit of Work
- `Include` para navegações quando necessário
- Métodos nomeados (`BarcodeExistsAsync`) em vez de expor `IQueryable`
- **Cobrança/globais**: filtrar por `UserId` explicitamente (sem query filter automático)
- Paginação retorna `(IEnumerable<T> Data, int TotalCount)`

---

## Tratamento de erros

Exceções de domínio herdam `AppException` (`Title`, `Detail`, `HttpStatus`, `Code`) e são tratadas pelo `ExceptionMiddleware`:

| Exceção | Status |
|---|---|
| `NotFoundException` | 404 |
| `BusinessException` | 400 |
| `UnauthorizedException` | 401 |
| `PaymentRequiredException` | 402 (`code`: `MODULE_NOT_IN_PLAN` / `PLAN_LIMIT_EXCEEDED`) |
| `PaymentGatewayException` | erro de integração com gateway |
| `ValidationException` (FluentValidation) | 400 |

Resposta sempre Problem Details (RFC 7807) com campo opcional `code`; `null` é omitido. Stack trace só em Development:
```json
{ "type": "...", "title": "Mensagem.", "status": 402, "detail": "...", "code": "MODULE_NOT_IN_PLAN" }
```

Validators em `PDV.Application/Validators/{Feature}/`. Paginação: `new PaginatedResponse<T>(data.Select(Map), page, pageSize, totalCount, totalPages)`.

---

## Storage (MinIO / S3)

`IStorageService` → `MinioStorageService` (S3 via AWS SDK, **singleton** thread-safe). Em dev usa dois clients: `opsClient` (endpoint interno `minio:9000`, chamadas reais) e `presignClient` (endpoint público `localhost:9000`, só assina URLs que o navegador acessa). Em prod ambos coincidem. Upload é direto frontend↔MinIO via presigned URL — **nunca passa pelo backend**. Banco guarda só o path relativo (`{tenantId}/...`). Helpers: `MediaPathHelper`, `StorageServiceExtensions`.

---

## Auditoria & Background services

`IAuditLogger` (`AuditLogger`, scoped) grava `AuditLog` por tenant (ações em enums `AuditAction`/`AuditEntityType`), resolvendo o autor uma vez por request. Detalhes serializados em JSON camelCase.

`IHostedService` registrados em `Program.cs`: `SubscriptionExpiryBackgroundService`, `RecurringExpenseRenewalService`, `AuditLogCleanupService`, `TenantDeletionBackgroundService`.

---

## Skills disponíveis (`skills/`)

| Tarefa | Skill |
|---|---|
| Nova entidade + migration | `new-entity.md` |
| Service + repositório | `new-service.md` |
| Controller + DTOs | `new-controller.md` |
| Upload de imagem | `image-upload.md` |

---

## O que nunca fazer

- Lógica de negócio no Controller (controllers são finos)
- Acessar `AppDbContext` fora de Infrastructure
- `IgnoreQueryFilters()` sem comentário justificando
- Esquecer de filtrar por `UserId` em repositório de cobrança/global (não há filtro automático)
- Delete físico onde há soft delete (`IsActive = false`)
- Retornar entidade do domínio direto na API — sempre DTO
- `TenantId` hardcoded em query manual
- Upload de arquivo passando pelo backend como intermediário
- Secrets ou connection strings commitados
