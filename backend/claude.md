# PDV-Ultra — Backend

API REST em ASP.NET Core (.NET 8+). Multi-tenant com `TenantId` via claim do JWT. **Em produção** — toda mudança nasce em branch própria e passa pelos testes antes do merge (ver CLAUDE.md da raiz).

## Estrutura de projetos

```
/backend
├── PDV.Api             ← Controllers, Attributes, Middleware, Program.cs (composition root)
├── PDV.Application     ← Interfaces, DTOs, Validators (FluentValidation), Helpers
├── PDV.Domain          ← Entidades, Enums, Exceptions, Constants, Interfaces (repositórios)
├── PDV.Infrastructure  ← Services, Repositories, AppDbContext, Storage, Migrations
├── PDV.UnitTests       ← NUnit 4 + Moq — fluxos críticos (ver PDV.UnitTests/README.md)
├── PDV.slnx            ← solution principal (inclui os testes)
└── backend.slnx        ← solution p/ Visual Studio com docker-compose.dcproj (sem testes)
```

**Domain** — entidades, enums, exceções (`AppException` e filhos), constantes (catálogos de plano/módulo — ver "Constantes de domínio") e **interfaces de repositório**. Zero dependência externa.

**Application** — interfaces de service, DTOs de entrada/saída, validators FluentValidation, helpers. Depende só do Domain.

**Infrastructure** — implementa services e repositórios, `AppDbContext`, storage, gateway de pagamento. Depende de Application e Domain.

**Api** — controllers finos (recebe → chama service → retorna), atributos de autorização, middlewares. Sem lógica de negócio. Tudo é registrado em `Program.cs`.

> Nota: interfaces de **repositório** ficam em `PDV.Domain/Interfaces`; interfaces de **service** em `PDV.Application/Interfaces`.

---

## Testes (`PDV.UnitTests`)

Testes por **fluxo do usuário** (não por classe), só do que é crítico: *se isto quebrar em silêncio, alguém perde dinheiro, dados ou vê dados de outra empresa?* Sem meta de cobertura total. Fluxos cobertos: `Authentication`, `AccessControl`, `AccountDeletion`, `Billing`, `Onboarding`. Nomes prefixados com o ID do cenário dos docs (`A3_`, `T4_`, `Scenario4_`).

⚠️ **No host Windows a suíte não executa** (Smart App Control bloqueia DLLs locais — `dotnet build` passa, o load em runtime falha). Rodar **em container** — comando pronto e todo o racional em [PDV.UnitTests/README.md](PDV.UnitTests/README.md).

Ao mexer em billing/auth/exclusão de conta, **rode a suíte antes do merge** e considere adicionar o cenário novo seguindo o padrão do README.

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

Três camadas, aplicadas via atributos no controller (de fora para dentro). Detalhes em [docs/access-control-e-entitlements.md](../docs/access-control-e-entitlements.md).

1. **`[Authorize]`** — exige JWT válido. `[Authorize(Roles = "Owner,Admin")]` restringe por role.
2. **`[RequireModule(OperationModule.X)]`** — gating de plano. Resolve o plano efetivo do tenant e lança `PaymentRequiredException` (**402**) se a capability não estiver incluída. Implementado por `IEntitlementService`.
3. **`[RequirePermission(Permission.X)]`** — permissão granular por cargo. Implementado por `IPermissionService`.

Roles (`UserRole`): **`Owner`** (acesso total ao tenant — `PermissionService` o libera sem checar permissões), **`Employee`** (acesso por permissão do cargo), **`Admin`** (admin de plataforma, `AdminController`).

Permissões granulares: o `Employee` tem um `RoleId` (`TenantRole`); `roleRepository.HasPermissionAsync(roleId, permission)` decide. Enums em `PDV.Domain/Enums`: `Permission` (ex.: `ViewStock`, `ManageStock`) e `OperationModule` (`Sales`, `Inventory`, `Services`, `Appointments`, `Expenses`, `Reports`, `Customers`, `Suppliers`, `Logs`, `Employees`).

Exemplo típico de controller:
```csharp
[Authorize]
[RequireModule(OperationModule.Inventory)]
public class ProductsController(...) {
    [HttpGet][RequirePermission(Permission.ViewStock)]    ...
    [HttpPost][RequirePermission(Permission.ManageStock)] ...
}
```

**Pipeline de middlewares** (`PDV.Api/Middleware`): `ExceptionMiddleware` (Problem Details), `MustChangePasswordMiddleware` (**403** enquanto a senha temporária não for trocada), `AccountDeletionBlockMiddleware` (**423** durante a carência de exclusão de conta).

---

## Constantes de domínio (`PDV.Domain/Constants`)

Fonte única dos valores fixos do sistema — o frontend só espelha as chaves (ver CLAUDE.md da raiz, "Constantes compartilhadas"):

| Constante | Papel |
|---|---|
| `ModuleCatalog` | Eixo de **access control**: módulos × permissões (exposto em `GET /api/access/metadata`) |
| `EntitlementCatalog` | Eixo de **billing**: capabilities booleanas de plano (módulos coarse + features fine, num só conjunto de chaves) |
| `PlanLimits` | Limites numéricos por plano (`-1` = ilimitado, e ilimitado é o **maior** valor) |
| `PlanTier`, `PlanSeedData`, `SegmentModuleDefaults` | Modelo/seed dos planos (Essencial × Pro — ambos têm todos os módulos; o diferencial são features + limites) |
| `TrialDefaults`, `RefundDefaults`, `RetentionDefaults`, `RetentionPolicy`, `CheckoutDefaults` | Janelas e regras de billing/retenção |
| `ImportLimits` | Limites da importação de dados |

---

## Assinaturas / cobrança (Stripe)

**Referência completa em [docs/subscriptions.md](../docs/subscriptions.md)** (cenários numerados, regras R/P/X/C/T) e [docs/entitlements-e-limits.md](../docs/entitlements-e-limits.md). Aqui, só o mapa do código e as regras de ouro:

- Gateway: `Services/Payments/Stripe` (SDK `Stripe.net`). `IPaymentGateway` fala com a API (checkout hospedado, upgrade proporcional, schedule de downgrade, cancel, refund, preview); `IPaymentWebhookProcessor` **verifica a assinatura antes do parse** (`Stripe-Signature`). Preços vêm da config (`Stripe:Prices:<slug>`), não do código.
- `WebhooksController` (`POST /api/webhooks/{provider}`, anônimo): corpo raw → parse verificado → idempotência (`WebhookEvent` por `evt_...`) → `BillingWebhookService.ProcessAsync` aplica estado + registra evento num **único `SaveChanges` atômico**.
- `IEntitlementService.ResolveForCurrentTenantAsync()` resolve o plano efetivo **via o Owner do tenant**. A regra de direito é `Subscription.IsEntitledAt(now)` (na **entidade**, não no service). Sem assinatura válida → módulos/limites vazios → 402.
- Gating de módulo/feature: `RequireModuleAsync` / `RequireEntitlementAsync` → 402 `NOT_IN_PLAN`. Limite numérico: o service chama `EnsureWithinLimitAsync(limitKey, count)` antes de criar → 402 `PLAN_LIMIT_EXCEEDED`. Módulos/limites são JSON no `Plan` (`EntitledModulesJson`, `LimitsJson`), lidos via `PlanJson`.
- Trial 30d é **PDV-side** (`TenantService` cria `Subscription` `Trialing` sem tocar o gateway; `User.HasUsedTrial` garante 1×). Upgrade cobra proporcional na hora; downgrade/ciclo↓ agenda via subscription schedule (`PendingPlanId` + `GatewayScheduleId`), promovido **só** pelo reconciliador de webhook.
- `DataExportController` fica **fora** do gate de plano por design — permite exportar após cancelamento.

> Regra de ouro nos handlers de webhook: **datas vêm do evento**, nunca de `DateTime.UtcNow`. Eventos `customer.subscription.*` são **reconciliação** (aplica-se o objeto inteiro), com `Subscription.GatewaySyncedAt` descartando eventos fora de ordem.

---

## Mapa de subsistemas

Além do CRUD por feature (Products, Sales, Customers, Suppliers, Expenses, Services, Appointments, Employees, Reports...), a API tem subsistemas que não são óbvios pela árvore de pastas:

| Subsistema | Código principal | Referência |
|---|---|---|
| Exclusão de conta (LGPD) — carência 30d, strip/purge | `AccountDeletionController/Service`, `DataDeletionService`, `DataPurgeBackgroundService`, `AccountDeletionBlockMiddleware` | [docs/account-deletion.md](../docs/account-deletion.md) |
| Exportação de dados (fora do gate de plano) | `DataExportController` | idem |
| Importação de dados | `DataImportController/Service`, `ImportLimits` | — |
| Documentos legais versionados (servidos p/ app e landing) | `LegalController`, `LegalDocumentService`, `LegalDocumentSeeder` | [docs/pendencias-documentos-legais.md](../docs/pendencias-documentos-legais.md) |
| Notificações in-app | `NotificationsController`, `NotificationService` (feature `notifications`) | — |
| Anúncios da plataforma | `AnnouncementsController`, `AnnouncementService` | [docs/announcements-module.md](../docs/announcements-module.md) |
| Contato/suporte | `ContactMessagesController`, `ContactMessageService` | — |
| Histórico de pagamentos do assinante | `PaymentHistoryController/Service` | — |
| Admin da plataforma (role `Admin`, frontend `/admin`) | `AdminController`, `AdminService` | — |
| Metadados de access control p/ o frontend | `AccessController` (`GET /api/access/metadata` ← `ModuleCatalog`) | — |

---

## Banco, Docker e ambientes

**Dev**: stack completa via `docker compose up` (raiz): MySQL, MinIO, API (`dotnet watch`, hot reload) e frontend (Vite). Portas no host: **MySQL `3307`** (→3306), MinIO `9000`/console `9001`, API `5000` (→8080), frontend `5173`.

Na inicialização (`Program.cs`), a API roda `db.Database.Migrate()` + seeders (`PlanSeeder`, `LegalDocumentSeeder`) automaticamente — **em produção também**, portanto migrations são **só-pra-frente**: uma migration que dropa coluna/tabela apaga dados reais no próximo deploy (ver [docs/manutencao-producao.md](../docs/manutencao-producao.md) §5).

**Produção** (`ASPNETCORE_ENVIRONMENT=Production`): cookies `Secure=true` + `SameSite=Strict`; CORS restrito às origens de `FRONTEND_URL`/`LANDING_URL` (env); secrets obrigatórios com `throw` no startup (`JWT_SECRET`, `Stripe:ApiKey`...); Dockerfile target `final` (sem `dotnet watch`). Config real vive no `.env.prod` da VPS (gitignored).

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

JWT em **cookie HttpOnly** (`access_token`); refresh token em cookie separado, armazenado no banco como **hash SHA256** (nunca o valor raw). O JWT chega pelo cookie via `JwtBearerEvents.OnMessageReceived` (não pelo header `Authorization`). `OnChallenge`/`OnForbidden` retornam Problem Details 401/403. Detalhes e cenários em [docs/auth.md](../docs/auth.md).

Claims: `sub`→userId, `tenantId`→tenant ativo (pode ser vazio), `name`, `role` (mapeado para `ClaimTypes.Role` via `RoleClaimType`), `jti`.

Login: **local** (`LocalAuth`, senha hasheada) ou **Google OAuth** (`ExternalAuth` + `IOAuthProvider`/`GoogleOAuthProvider`). Um usuário pode ter múltiplos tenants (`UserTenant`); o ativo é `User.LastTenantId`; `SwitchTenant` reemite o JWT com o `tenantId` trocado. Eventos de login/logout são auditados via `AuthEventLogger`.

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
| `PaymentRequiredException` | 402 (`code`: `NOT_IN_PLAN` / `PLAN_LIMIT_EXCEEDED`) |
| `PaymentGatewayException` | erro de integração com gateway |
| `ValidationException` (FluentValidation) | 400 |

Resposta sempre Problem Details (RFC 7807) com campo opcional `code`; `null` é omitido. Stack trace só em Development:
```json
{ "type": "...", "title": "Mensagem.", "status": 402, "detail": "...", "code": "NOT_IN_PLAN" }
```

Validators em `PDV.Application/Validators/{Feature}/`. Paginação: `new PaginatedResponse<T>(data.Select(Map), page, pageSize, totalCount, totalPages)`.

---

## Storage (S3: MinIO em dev, Cloudflare R2 em produção)

`IStorageService` → `MinioStorageService` (S3 via AWS SDK, **singleton** thread-safe). Em dev usa dois clients: `opsClient` (endpoint interno `minio:9000`, chamadas reais) e `presignClient` (endpoint público `localhost:9000`, só assina URLs que o navegador acessa). Em produção ambos coincidem, apontando para o **Cloudflare R2** (`Storage__Region=auto` — região configurável via `StorageOptions.Region`). Upload é direto frontend↔storage via presigned URL — **nunca passa pelo backend**. Banco guarda só o path relativo (`{tenantId}/...`). Helpers: `MediaPathHelper`, `StorageServiceExtensions`.

---

## Auditoria & Background services

`IAuditLogger` (`AuditLogger`, scoped) grava `AuditLog` por tenant (ações em enums `AuditAction`/`AuditEntityType`), resolvendo o autor uma vez por request. Detalhes serializados em JSON camelCase. `SystemLogWriterService` persiste logs de sistema (observabilidade do admin).

`IHostedService` registrados em `Program.cs`: `SystemLogWriterService`, `SubscriptionExpiryBackgroundService`, `RecurringExpenseRenewalService`, `AuditLogCleanupService`, `TenantDeletionBackgroundService`, `DataPurgeBackgroundService`.

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

- Desenvolver direto na `master` — branch própria + testes antes do merge
- Migration destrutiva (drop de coluna/tabela) sem plano — produção roda `Migrate()` no startup
- Lógica de negócio no Controller (controllers são finos)
- Acessar `AppDbContext` fora de Infrastructure
- `IgnoreQueryFilters()` sem comentário justificando
- Esquecer de filtrar por `UserId` em repositório de cobrança/global (não há filtro automático)
- Delete físico onde há soft delete (`IsActive = false`)
- Retornar entidade do domínio direto na API — sempre DTO
- `TenantId` hardcoded em query manual
- Datas de `DateTime.UtcNow` em handler de webhook — sempre do evento
- Upload de arquivo passando pelo backend como intermediário
- Secrets ou connection strings commitados
