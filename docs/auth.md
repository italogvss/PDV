# Autenticação e Autorização — PDV-Ultra

Documento de referência do módulo de **login, sessão e controle de acesso**, de ponta a ponta.
Use-o para entender o fluxo, diagnosticar erros `401 / 402 / 403` e manter o código com segurança.

> Atualizado em 2026-07-02. Substitui o rascunho antigo em `.claude/auth-flow.md`.
> Convenção do projeto: código em inglês, documentação em português.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Os quatro eixos de acesso](#2-os-quatro-eixos-de-acesso)
3. [Métodos de login](#3-métodos-de-login)
4. [Onboarding: criação do negócio e trial](#4-onboarding-criação-do-negócio-e-trial)
5. [JWT e cookies](#5-jwt-e-cookies)
6. [Como o backend lê a identidade](#6-como-o-backend-lê-a-identidade)
7. [Autorização no backend (3 camadas de atributo)](#7-autorização-no-backend-3-camadas-de-atributo)
8. [Plano / entitlement (gating 402)](#8-plano--entitlement-gating-402)
9. [`GET /auth/me`: o que a sessão recebe](#9-get-authme-o-que-a-sessão-recebe)
10. [Refresh token](#10-refresh-token)
11. [Multi-tenant e troca de loja](#11-multi-tenant-e-troca-de-loja)
12. [Frontend: sessão, guards e interceptors](#12-frontend-sessão-guards-e-interceptors)
13. [Entidades e propriedades](#13-entidades-e-propriedades)
14. [Cenários possíveis](#14-cenários-possíveis)
15. [Diagnóstico de erros](#15-diagnóstico-de-erros)
16. [Arquivos-chave](#16-arquivos-chave)
17. [Melhorias e bugs encontrados](#17-melhorias-e-bugs-encontrados)

---

## 1. Visão geral

```
┌─ LOGIN ────────────────────────────────────────────────────────────────┐
│ [Browser] ── Google ID Token ──▶  POST /api/auth/google                 │
│ [Browser] ── username + senha ─▶  POST /api/auth/local                  │
│                                                                          │
│   AuthService:                                                           │
│     valida credencial → cria/atualiza User → ResolveActiveTenant        │
│     gera access_token (JWT, 8h) + refresh_token (raw)                   │
│     grava SHA256(refresh_token) no User (expiry 30d)                    │
│                                                                          │
│   Set-Cookie access_token   (HttpOnly, 8h,  SameSite=Strict)            │
│   Set-Cookie refresh_token  (HttpOnly, 30d, SameSite=Strict)            │
│ [Browser] ◀── 200 OK ────────────────────────────────────────────────── │
└──────────────────────────────────────────────────────────────────────────┘

┌─ BOOTSTRAP DA SESSÃO ──────────────────────────────────────────────────┐
│ [Browser] ── GET /api/auth/me ──▶  lê JWT + banco                        │
│   retorna: id, name, email, role, lastTenantId,                         │
│            settings(theme/accent/textSize), tenants[],                   │
│            mustChangePassword, permissions[], modules[]                  │
│ [Redux auth.slice] ◀── setAuth(user)                                     │
│        │                                                                 │
│        ▼  RouterGuard decide a rota:                                     │
│           mustChangePassword ─▶ /trocar-senha                           │
│           !tenantId          ─▶ /criar-negocio                          │
│           OK                 ─▶ /  (DashboardLayout)                     │
└──────────────────────────────────────────────────────────────────────────┘

┌─ REQUISIÇÃO AUTENTICADA ───────────────────────────────────────────────┐
│ [Browser] ── cookie access_token + header X-Tenant-Id ──▶ /qualquer     │
│   JwtBearer lê o token do COOKIE (não do header Authorization)          │
│   Claims: sub, tenantId, name, role, jti                                │
│   [Authorize] → [RequireModule] (402) → [RequirePermission] (403)       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Os quatro eixos de acesso

O ponto que **mais mudou** desde o rascunho antigo: hoje existem **quatro eixos independentes**. Confundi-los é a causa nº 1 de bugs de acesso.

| # | Eixo | Pergunta | Onde vive | Falha vira |
|---|---|---|---|---|
| 1 | **Autenticação** | Quem é você? | JWT em cookie `access_token` | `401` |
| 2 | **Role (tenant)** | Owner, Employee ou Admin no tenant ativo? | claim `role` (vem de `UserTenant.Role`) | `403` |
| 3 | **Permissão granular** | O cargo do Employee tem essa permissão? | `TenantRole` → `Permission[]` | `403` |
| 4 | **Módulo de operação** | O tenant habilitou esse módulo? | `TenantSettings.EnabledModulesJson` | (esconde a UI) |

E, **separado destes**, um eixo transversal de **cobrança**:

| Eixo | Pergunta | Onde vive | Falha vira |
|---|---|---|---|
| **Entitlement / plano** | O plano do Owner cobre essa capability/limite? | `Subscription` → `Plan` (JSON) | `402` |

> **Regra de ouro (frontend):** o **plano nunca esconde ou desabilita a UI**. Renderize a tela e deixe o backend responder **402** — o erro vira um toast amigável de upgrade. Quem esconde/desabilita a UI é só o eixo de **acesso** (role/permissão/módulo).

**Access vs. Billing** — não confundir:
- **Access (eixos 2–4):** `role`, `Permission`, `OperationModule`. Definem o que o usuário *pode operar* naquela loja. Chegam ao frontend via `/auth/me` (`role`, `permissions[]`, `modules[]`).
- **Billing (eixo entitlement):** `EntitlementCatalog` (chaves de módulo + features Pro) e `PlanLimits`. Definem o que o *plano contratado* libera. **Só existe no backend**, aplicado por `[RequireModule]`, `[RequireEntitlement]` e `EnsureWithinLimitAsync` → **402**.

Detalhe sutil e importante: um módulo aparece em **dois** catálogos.
- `OperationModule` / `EnabledModulesJson` (eixo de acesso — o Owner liga/desliga na tela de Operação).
- `EntitlementCatalog.Modules` (eixo de billing — hoje **ambos os planos** concedem todos os módulos; o diferencial Pro são as *features* e os *limites*).

---

## 3. Métodos de login

### 3a. Login com Google — `POST /api/auth/google`

Fluxo do **proprietário** (Owner). Um Owner sempre entra por Google.

**Frontend** (`pages/Login/index.tsx`, toggle "Proprietário"):
```ts
await authService.loginWithGoogle(credential)   // POST /auth/google  { credential }
const user = await authService.getMe()          // GET  /auth/me
dispatch(setAuth(user))
navigate(user.tenantId ? '/' : '/criar-negocio', { replace: true })
```
- `GoogleSignInButton` carrega o script GSI com `VITE_GOOGLE_CLIENT_ID` e devolve o **Google ID Token**.
- Note que o fluxo do Google **não** checa `mustChangePassword` no redirect — Owner via Google nunca tem senha local.

**Backend** (`AuthService.LoginWithGoogleAsync` → `HandleGoogleCallbackAsync`):
1. Valida o ID Token com `GoogleJsonWebSignature.ValidateAsync` (assinatura, `Audience = Google:ClientId`, expiração).
2. Exige `payload.EmailVerified == true` (evita account-takeover no fallback por email).
3. Busca o usuário **exclusivamente por `ExternalAuth(Provider="Google", ProviderId=sub)`** — **sem fallback por email** (comentado no código, para não colidir com contas de Employee que compartilhem email).
4. **Não existe** → cria `User { Role = Owner }` + `ExternalAuth(Google)` + `UserSettings { Theme = Light }`.
5. **Existe** → atualiza `Name`/`ImageUrl` e vincula o Google se ainda não estiver vinculado.
6. `ResolveActiveTenant` → gera JWT + refresh token → cookies.

### 3b. Login local — `POST /api/auth/local`

Fluxo do **funcionário** (Employee). O Owner cria o funcionário com **username + senha temporária**; no 1º acesso `MustChangePassword = true`.

**Frontend** (`pages/Login/index.tsx`, toggle "Funcionário", form RHF+Zod):
```ts
await authService.loginWithLocal(username, password)  // POST /auth/local { username, password }
const user = await authService.getMe()
dispatch(setAuth(user))
navigate(user.mustChangePassword ? '/trocar-senha' : user.tenantId ? '/' : '/criar-negocio',
         { replace: true })
```

**Backend** (`AuthService.LoginWithLocalAsync`):
1. Busca por `Username` (`GetByUsernameAsync`).
2. Retorna **sempre a mesma mensagem** "Credenciais inválidas." se: usuário inexistente, `!IsActive`, sem `LocalAuth`, ou hash bcrypt divergente (não revela se o usuário existe).
3. `ResolveActiveTenant` → gera JWT (+ claim `mustChangePassword:"true"` se aplicável) + refresh token → cookies.

**Provisionamento do funcionário** (`EmployeeService.CreateAsync`): cria `User { Role = Employee, Username }` + `LocalAuth { PasswordHash = bcrypt(temp), MustChangePassword = true }` + `UserSettings` + `UserTenant(Employee)` **do tenant atual** + `Employee { RoleId }`. Sem o `UserTenant`, o login não resolveria o `tenantId` e o funcionário nunca acessaria a loja.

### 3c. Troca de senha obrigatória — `POST /api/auth/change-password`

Rota `/trocar-senha` é exclusiva desse fluxo. Requer `[Authorize]` (o funcionário já está logado com o JWT do 1º acesso).

**Frontend** (`pages/ChangePassword/index.tsx`): valida `newPassword` (≥8, com número e caractere especial) e confirmação; ao sucesso `dispatch(setMustChangePassword(false))` e navega para `/`.

**Backend** (`AuthService.ChangePasswordAsync`): valida o request (FluentValidation), confere `CurrentPassword` (bcrypt), grava novo hash e zera `MustChangePassword`.

---

## 4. Onboarding: criação do negócio e trial

Rota `/criar-negocio` (guard `onboarding`): usuário autenticado **sem tenant**. Employee é redirecionado para `/` (funcionário nasce vinculado a um tenant).

**`POST /api/tenants`** (`TenantController.Create` → `TenantService.CreateAsync`):
1. Cria `Tenant` + `TenantSettings` (módulos default por `Segment` via `SegmentModuleDefaults`).
2. Cria o vínculo `UserTenant { Role = Owner }` e define `User.LastTenantId`.
3. Cria os **cargos default** do tenant: `Gerente` (acesso amplo) e `Atendente` (vendas + consultas). Ambos `IsDefault = true`.
4. **Trial PDV-side** (`StartTrialIfEligibleAsync`): se veio `?plano=<slug>` da landing **e** `!User.HasUsedTrial` **e** sem assinatura viva → cria `Subscription { Status = Trialing, TrialEndsAt = now + TrialDefaults.DurationDays }` **sem tocar o gateway** e marca `HasUsedTrial`. Slug ausente/desconhecido → segue sem trial, sem falhar o onboarding.
5. **Reemite o `access_token`** já com o `tenantId` novo e o role `Owner`, e grava no cookie (`Response.Cookies.Append("access_token", ...)`).

**Frontend** (`hooks/useCreateTenant.ts`): o slug do plano é capturado da URL no boot (`AuthProvider` → `capturePlanSlugFromUrl`) e recuperado aqui (`getStoredPlanSlug`). Após criar, faz upload opcional do logo, chama `/auth/me` de novo (agora com tenant) e navega para `/`.

> Sem assinatura viva, `EntitlementService` resolve **módulos/limites vazios** → todo endpoint com `[RequireModule]` retorna **402**. O 1º negócio nunca é bloqueado no onboarding porque, com 0 negócios, o limite de lojas resolve como ilimitado.

---

## 5. JWT e cookies

O JWT é montado em `AuthService.GenerateToken` (e, no onboarding/troca de loja, num helper equivalente em `TenantService`):

| Claim | Origem | Uso |
|---|---|---|
| `sub` | `User.Id` (GUID) | Identidade do usuário (lido via `ClaimTypes.NameIdentifier`) |
| `tenantId` | tenant ativo (`""` se nenhum) | Filtro multi-tenant no `AppDbContext` (`ITenantContext`) |
| `name` | `User.Name` | Exibição / `IUserContext.UserName` |
| `role` | **`UserTenant.Role`** do tenant ativo (`Admin` usa `User.Role`) | `[Authorize(Roles=...)]`, `PermissionService` |
| `jti` | `Guid.NewGuid()` | Id único do token (⚠️ não é persistido nem verificado — sem revogação) |
| `mustChangePassword` | `"true"` (ausente quando false) | Setado no login local e **preservado no refresh** enquanto `MustChangePassword`; **enforced** por `MustChangePasswordMiddleware` |

`tenantId` vazio ⇒ usuário sem tenant (onboarding). O `role` **vem sempre do vínculo `UserTenant`**, nunca de `User.Role` global (exceção: `Admin`).

**Cookies** (setados por `AuthController` / `TenantController`):

| Cookie | HttpOnly | Secure | SameSite | MaxAge |
|---|---|---|---|---|
| `access_token` | ✅ | só em Production | Strict | 8h (`JWT_EXPIRES_HOURS`) |
| `refresh_token` | ✅ | só em Production | Strict | 30 dias |

`Secure = IsProduction` (dev via HTTP, prod exige HTTPS). O refresh token é gravado no banco como **hash SHA256** — o valor raw só existe no cookie.

---

## 6. Como o backend lê a identidade

### JwtBearer via cookie (`Program.cs`)
```csharp
options.TokenValidationParameters = new TokenValidationParameters
{
    ValidateIssuer = false,
    ValidateAudience = false,
    ValidateLifetime = true,
    ValidateIssuerSigningKey = true,
    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
    RoleClaimType = ClaimTypes.Role,   // handler .NET 8+ não mapeia "role" sozinho
};
options.Events = new JwtBearerEvents
{
    OnMessageReceived = ctx => { if (ctx.Request.Cookies.TryGetValue("access_token", out var t)) ctx.Token = t; return Task.CompletedTask; },
    OnChallenge = ctx => { /* escreve Problem Details 401 "Não autenticado." */ },
    OnForbidden = ctx => { /* escreve Problem Details 403 "Acesso negado." */ },
};
```
Não é necessário enviar `Authorization: Bearer ...` — o token é lido do cookie. `OnChallenge`/`OnForbidden` devolvem **Problem Details (RFC 7807)**.

### Contextos scoped
- **`ITenantContext` (`TenantContext`)** — lê o claim `tenantId`; lança `UnauthorizedAccessException` se ausente. Alimenta o `HasQueryFilter` global do `AppDbContext`.
- **`IUserContext` (`UserContext`)** — `UserId` (via `NameIdentifier`, com fallback para `"sub"`) e `UserName`.

### CORS
Só o `FRONTEND_URL` é permitido, com `AllowCredentials()` (necessário para o cookie cruzar origem).

---

## 7. Autorização no backend (3 camadas de atributo)

Aplicadas nos controllers, de fora para dentro:

```csharp
[Authorize]                              // 1) exige JWT válido (401 se faltar)
[RequireModule(OperationModule.Inventory)]  // 2) plano cobre o módulo? (402 se não)
public class ProductsController(...) {
    [HttpGet]  [RequirePermission(Permission.ViewStock)]    // 3) cargo tem a permissão? (403)
    [HttpPost] [RequirePermission(Permission.ManageStock)]
}
```

| Camada | Atributo | Serviço | Falha |
|---|---|---|---|
| 1. Autenticação/Role | `[Authorize]`, `[Authorize(Roles="Owner,Admin")]` | JwtBearer | `401` / `403` |
| 2. Módulo de plano | `[RequireModule(OperationModule.X)]` | `IEntitlementService.RequireModuleAsync` | `402 NOT_IN_PLAN` |
| 2'. Capability de plano | `[RequireEntitlement("chave")]` | `IEntitlementService.RequireEntitlementAsync` | `402 NOT_IN_PLAN` |
| 3. Permissão granular | `[RequirePermission(Permission.X)]` | `IPermissionService.RequireAsync` | `403` |

### `PermissionService.RequireAsync`
```csharp
if (role == "Owner" || role == "Admin") return;   // Owner e Admin passam direto
// Employee: busca o Employee do (userId, tenantId ativo) e checa
roleRepository.HasPermissionAsync(employee.RoleId, permission)  // false → UnauthorizedException (401)
```
> `Owner` e `Admin` são liberados sem checar permissões (alinhado com o `useUserPermissions` do frontend). Qualquer outra role cai no caminho de Employee e, sem um `Employee` correspondente, lança `UnauthorizedException`. Admin continua usando `[Authorize(Roles="Admin")]` no `AdminController`, mas agora `[RequirePermission]` numa rota compartilhada **não** o quebra mais.

### Roles (`UserRole`)
- **`Owner`** — dono da loja. Acesso total ao tenant; `PermissionService` o libera sem checar permissões.
- **`Employee`** — funcionário; acesso definido pelas permissões do seu `TenantRole`.
- **`Admin`** — admin de plataforma (fora do fluxo de tenant; `AdminController`).

### Permissões granulares (enum `Permission`, 17 valores)
`SellProducts`, `CancelSales`, `ViewStock`, `ManageStock`, `ViewSalesHistory`, `ViewExpenses`, `ManageExpenses`, `ViewReports`, `ManageEmployees`, `ViewEmployees`, `ManageAppointments`, `ViewAppointments`, `ManageCustomers`, `ViewCustomers`, `ManageSuppliers`, `ViewSuppliers`, `ViewLogs`.

Agrupadas em **`TenantRole`** (cargo customizado por tenant, ex.: "Gerente", "Atendente"). Cada `Employee.RoleId` aponta para um `TenantRole`; `TenantRolePermission` é o join `TenantRole ↔ Permission`.

```
TenantRole "Atendente"
  └── TenantRolePermission: SellProducts, ViewSalesHistory, ViewStock, ViewCustomers, ViewAppointments
Employee.RoleId ─▶ TenantRole "Atendente"
```

> **Estado do enforcement (mudou!):** a camada 3 **já está aplicada no backend** via `[RequirePermission]` + `IPermissionService`. Não é mais só frontend.

---

## 8. Plano / entitlement (gating 402)

Resumo do que o auth precisa saber (detalhes completos em [`docs/subscriptions.md`](./subscriptions.md)).

`EntitlementService.ResolveForCurrentTenantAsync()`:
1. Resolve o **Owner** do tenant atual (`userTenantRepository.GetOwnerUserIdAsync`).
2. Pega a `Subscription` viva do Owner (`subscriptionRepository.GetLiveByUserIdAsync`).
3. `IsEntitled(sub)`? → `Trialing` (até `TrialEndsAt`) **ou** `Active`/`Canceled` (até `CurrentPeriodEnd`).
   - Sim → lê `EntitledModulesJson` + `LimitsJson` do `Plan`.
   - Não → **módulos/limites vazios** → app efetivamente bloqueado (todo `[RequireModule]` → 402).

- **Módulo** ausente → `402 NOT_IN_PLAN` (`RequireModuleAsync` delega para `RequireEntitlementAsync(EntitlementCatalog.ForModule(m))`).
- **Limite numérico** → o **service** chama `EnsureWithinLimitAsync(limitKey, currentCount)` antes de criar (ex.: `PlanLimits.MaxProducts`, `Employees`, `Stores`) → `402 PLAN_LIMIT_EXCEEDED`.

A assinatura pertence ao **Owner (`UserId`)** e cobre todas as lojas dele; por isso `Subscription` **não tem filtro de tenant** e é isolada por `UserId` no repositório.

---

## 9. `GET /auth/me`: o que a sessão recebe

`AuthController.Me` extrai `userId`, `role` e `tenantId` do JWT e chama `AuthService.GetMeAsync`. Retorna `MeResponse`:

| Campo | Origem | Observação |
|---|---|---|
| `Id`, `Name`, `Email`, `Phone`, `Document`, `BirthDate` | `User` | perfil |
| `AvatarUrl` | `storage.ResolveReadUrlAsync(User.ImageUrl, Profile)` | presigned URL |
| `LastTenantId` | `User.LastTenantId` | vira `tenantId` no Redux |
| `Role` | **role do JWT** (= `UserTenant.Role` do tenant ativo; cai para `User.Role` só sem tenant) | consistente com o enforcement do backend |
| `Settings` | `UserSettings` | `Theme`, `TextSize`, `AccentColor` |
| `Tenants[]` | `UserTenants` → `TenantListItem` | `{ tenantId, name, role, logoUrl, isActive, scheduledDeletionAt }` |
| `MustChangePassword` | `LocalAuth?.MustChangePassword ?? false` | fonte real do redirect de troca de senha |
| `Permissions[]` | só se `role == "Employee" && tenantId` → `TenantRole.Permissions` | **vazio para Owner** |
| `Modules[]` | `TenantSettings.EnabledModulesJson` do tenant ativo | eixo de **acesso**, não de plano |

Pontos-chave:
- **Owner não recebe `permissions`** — o hook `useUserPermissions` trata Owner/Admin como acesso total.
- **`Modules[]` é o eixo de acesso** (o que o Owner habilitou na Operação), independente do plano. O gating de plano é sempre `402` no backend, nunca escondido via `modules`.

---

## 10. Refresh token

### Backend (`AuthService.RefreshAsync`)
1. `SHA256(refresh_token)` → busca o `User` pelo hash (`GetByRefreshTokenAsync`).
2. Valida expiração (`RefreshTokenExpiry`, 30 dias).
3. **Rotação completa:** gera novo access_token **e** novo refresh_token (novo hash + nova expiry). O refresh anterior deixa de valer. O access_token reemitido **preserva o claim `mustChangePassword`** enquanto `LocalAuth.MustChangePassword` for `true`.
4. `AuthController.Refresh` seta os dois cookies; em `UnauthorizedException` → expira os cookies e retorna `401`.

> A rotação torna cada refresh token **single-use**.

> **Revogação (trade-off):** o `access_token` é um JWT **stateless** — o `jti` não é persistido nem verificado. Logout e troca de senha/role zeram o refresh token no banco, mas o access_token já emitido **continua válido até expirar** (até 8h). Não há blacklist de `jti`; é uma decisão consciente de manter o token stateless. Janela máxima de exposição = `JWT_EXPIRES_HOURS`.

### Frontend (`services/api.ts`, interceptor de resposta)
```ts
if (status === 401 && !config._isRetry) {
  config._isRetry = true
  // refreshPromise compartilhado: 401s concorrentes aguardam UM só /auth/refresh (evita
  // rotacionar o token single-use em paralelo → logout espúrio).
  try { await (refreshPromise ??= axios.post('/auth/refresh').finally(() => refreshPromise = null)); return api(config) }
  catch { store.dispatch(clearAuth()); throw error }              // refresh falhou → desloga
}
```
Refresh é 100% transparente: nenhum componente trata 401 manualmente. Um único `refreshPromise` compartilhado deduplica refreshes concorrentes no boot.

---

## 11. Multi-tenant e troca de loja

```
User (Google/Owner) ──Owner──▶ Tenant X
User (local/Employee) ─Employee─▶ Tenant Y
```
- O tenant ativo é `User.LastTenantId` (ou o primeiro `UserTenant`, via `ResolveActiveTenant`).
- **`POST /api/auth/switch-tenant/{tenantId}`** (`SwitchTenantAsync`): valida o vínculo, atualiza `LastTenantId` e **reemite só o `access_token`** (novo `tenantId` + `role` daquele vínculo). O `refresh_token` **não** é rotacionado.
- **`DELETE /api/tenants/current`** (`DeactivateCurrentAsync`, só Owner): desativa a loja (`IsActive=false`, `ScheduledDeletionAt = +1 mês`), aponta `LastTenantId` para outra loja ativa e reemite o `access_token`. Bloqueia se for a única loja ativa.

---

## 12. Frontend: sessão, guards e interceptors

### Redux `auth.slice.ts` (não é cache de API — é a **sessão**)
Campos: identidade (`userId`, `tenantId`, `role`, `name`, `email`, `phone`, `document`, `birthDate`, `avatarUrl`), flags (`isAuthenticated`, `isLoading`, `mustChangePassword`), `tenants[]`, **`permissions[]` + `modules[]`** (acesso), aparência (`theme`, `accentColor`, `textSize`) e `subscription` (espelho **síncrono** do entitlement — a fonte continua sendo o React Query).
Actions: `setAuth`, `clearAuth`, `setLoading`, `setTenant`, `setMustChangePassword`, `setProfile`, `setAppearance`, `setModules`, `setSubscription`.

`isLoading: true` é o estado inicial; o `AuthProvider` faz `/auth/me` no mount e só então `setAuth`/`clearAuth`.

### `AuthProvider` (bootstrap)
```ts
capturePlanSlugFromUrl()                 // guarda ?plano= antes do fluxo de auth
authService.getMe()
  .then(u => dispatch(setAuth(u)))
  .catch(() => dispatch(clearAuth()))
```

### `RouterGuard` (guard único, prop `type`)
| Tipo | Rota | Regra |
|---|---|---|
| `public` | `/login` | autenticado → `mustChangePassword?/trocar-senha : tenantId?/ : /criar-negocio` |
| `protected` | `/*` (DashboardLayout) | exige auth; `mustChangePassword → /trocar-senha` |
| `onboarding` | `/criar-negocio` | exige auth **sem** tenant; Employee → `/`; com tenant → `/` |
| `change-password` | `/trocar-senha` | exige auth **com** `mustChangePassword` |

Enquanto `isLoading`, mostra spinner (exceto `change-password`, que renderiza `null`).

### `PermissionGuard` (por rota)
```tsx
const { hasPermission } = useUserPermissions()
if (!hasPermission(permission)) return <Navigate to="/" replace />
```
Rotas protegidas: `/vendas`→`SellProducts`, `/historico`→`ViewSalesHistory`, `/estoque`→`ViewStock`, `/agendamentos`→`ViewAppointments`, `/despesas`→`ViewExpenses`, `/funcionarios`→`ViewEmployees`, `/relatorios`→`ViewReports`, `/clientes`→`ViewCustomers`, `/fornecedores`→`ViewSuppliers`, `/logs`→`ViewLogs`. (`/servicos`, `/configuracoes`, `/ajuda`, `/contato`, `/assinatura/retorno` são livres para autenticados.)

### `useUserPermissions`
```ts
const isOwner = role === 'Owner' || role === 'Admin'
hasPermission(p)   = isOwner || permissions.includes(p)
isModuleEnabled(m) = modules.includes(m)   // vale p/ todos, inclusive Owner
```
Três pontos de enforcement no frontend: **rota** (`PermissionGuard`), **navegação** (`Sidebar` filtra `NAV_SECTIONS` por `ownerOnly`/`module`/`requiredPermission`) e **query** (gate no `enabled` do hook React Query).

### `api.ts` (axios)
- `withCredentials: true` (envia cookies) em todo request.
- Interceptor de **request**: injeta `X-Tenant-Id` (lido do Redux) — **nunca** passar tenant manualmente.
- Interceptor de **response**: 401 → refresh único → retry; senão `clearAuth()`.
- `402` **não** é interceptado — sobe como erro e vira toast de upgrade via `useApiError`.

---

## 13. Entidades e propriedades

### Backend

| Entidade | Propriedades relevantes | Papel |
|---|---|---|
| `User` | `Email`, `Username?`, `Name`, `ImageUrl?`, `Role` (`UserRole`), `LastTenantId?`, `RefreshToken?` (hash SHA256), `RefreshTokenExpiry?`, `HasUsedTrial`, `Settings`, `LocalAuth?`, `ExternalLogins[]`, `UserTenants[]` | Identidade global |
| `LocalAuth` | `UserId`, `PasswordHash` (bcrypt), `MustChangePassword` (default `true`) | Login por senha |
| `ExternalAuth` | `UserId`, `Provider` ("Google"…), `ProviderId` (sub do provedor) | Login social |
| `UserTenant` | `UserId`, `TenantId`, `Role` (`UserRole` por tenant), `JoinedAt` | Join User↔Tenant (**não** herda `BaseEntity`) |
| `UserSettings` | `Theme`, `AccentColor`, `TextSize`, flags | Aparência/preferências |
| `Employee` | `UserId?`, `RoleId` → `TenantRole`, `TenantId`, salário… | Funcionário no tenant |
| `TenantRole` | `Name`, `Description`, `Color`, `IsDefault`, `Permissions[]` | Cargo customizado |
| `TenantRolePermission` | `Permission` (enum) | Join cargo↔permissão |
| `Tenant` / `TenantSettings` | `IsActive`, `ScheduledDeletionAt`, `EnabledModulesJson`, `FantasyName`, `LogoUrl` | Loja + config |
| `Subscription` | `UserId` (Owner), `PlanId`, `Status`, `TrialEndsAt?`, `CurrentPeriodEnd?` | Assinatura (billing) |

### Frontend

| Tipo/arquivo | Conteúdo |
|---|---|
| `types/auth.types.ts` | `AuthUser`, `UserRole = 'Owner'\|'Employee'\|'Admin'` |
| `types/employee.types.ts` | `Permission` (keyof `PERMISSIONS`), mapa `PERMISSIONS` PT-BR, `TenantRole`, `Employee` |
| `constants/modules.ts` | `OperationModule`, `OPERATION_MODULES`, `ALL_MODULES`, `permissionToModule` |
| `store/slices/auth.slice.ts` | `AuthState` + actions |

---

## 14. Cenários possíveis

| # | Cenário | Resultado |
|---|---|---|
| 1 | Owner novo (1º login Google) | Cria `User(Owner)`; sem tenant → `/criar-negocio` |
| 2 | Owner recorrente com loja | JWT com `tenantId` → `/` |
| 3 | Owner com `?plano=pro` na landing | Onboarding cria trial 30d; `/` com plano `Trialing` |
| 4 | Funcionário, 1º acesso | Login local OK, `mustChangePassword` → `/trocar-senha` |
| 5 | Funcionário após trocar senha | `MustChangePassword=false` → `/` |
| 6 | Funcionário sem permissão numa rota | `PermissionGuard` → redireciona `/` (backend também barra 403) |
| 7 | Owner com 2 lojas troca de loja | `switch-tenant` reemite access_token; nav e módulos recarregam via `/auth/me` |
| 8 | Access token expira durante uso | interceptor faz refresh e repete a request (transparente) |
| 9 | Refresh token expirado (>30d) | `/auth/refresh` 401 → `clearAuth()` → `/login` |
| 10 | Módulo não incluído no plano | Backend `402 NOT_IN_PLAN` → toast de upgrade (UI **não** é escondida) |
| 11 | Limite do plano atingido (ex.: nº de produtos) | Backend `402 PLAN_LIMIT_EXCEEDED` no create |
| 12 | Sem assinatura viva | Entitlement vazio → todo módulo 402 → app bloqueado até assinar |
| 13 | Owner encerra a loja atual | `DELETE /tenants/current` desativa e troca para outra loja ativa |
| 14 | Logout | Zera refresh no banco + expira cookies (JWT ainda vale até 8h — sem revogação) |

---

## 15. Diagnóstico de erros

### 401 Unauthorized
| Causa | Onde olhar |
|---|---|
| Cookie `access_token` ausente/expirado | O refresh está funcionando? (`/auth/refresh`) |
| `tenantId` ausente no JWT | Usuário sem tenant — precisa criar/ingressar |
| Google token inválido | `VITE_GOOGLE_CLIENT_ID` × `Authentication:Google:ClientId` |
| Refresh token expirado (>30d) | Fazer login novamente |
| Senha local incorreta | Mensagem genérica intencional |
| `[RequirePermission]` num usuário sem `Employee` (ex.: Admin) | Rota errada — Admin usa `[Authorize(Roles="Admin")]` |

### 402 Payment Required
| `code` | Causa | Onde olhar |
|---|---|---|
| `NOT_IN_PLAN` | Módulo/feature fora do plano do Owner | `EntitledModulesJson` do `Plan`; status da `Subscription` |
| `PLAN_LIMIT_EXCEEDED` | Limite numérico atingido | `PlanLimits`; contagem atual no service |
| (sem assinatura viva) | Trial/assinatura expirada → entitlement vazio | `Subscription.Status`, `TrialEndsAt`, `CurrentPeriodEnd` |

### 403 Forbidden
| Causa | Onde olhar |
|---|---|
| Role insuficiente (`[Authorize(Roles="Owner,Admin")]`) | `UserTenant.Role` do tenant ativo |
| Employee sem a permissão do cargo | `TenantRole.Permissions` do `Employee.RoleId` |
| Token com `tenantId` de outro recurso | Trocar de loja (`switch-tenant`) |

### Redirecionamento inesperado (frontend)
| Sintoma | Causa provável |
|---|---|
| Employee cai em `/` sem ver a página | `PermissionGuard` bloqueou — checar `permissions[]` no Redux |
| Owner bloqueado numa rota | Não deveria ocorrer — `isOwner` bypassa permissões |
| Loop em `/trocar-senha` | `mustChangePassword` ficou `true` (troca falhou silenciosamente) |
| UI "some" para uma feature | Provável módulo desabilitado (`modules[]`), **não** plano |

---

## 16. Arquivos-chave

### Backend
| Arquivo | Responsabilidade |
|---|---|
| `PDV.Api/Program.cs` | JwtBearer via cookie, `RoleClaimType`, `OnChallenge/OnForbidden`, CORS, DI |
| `PDV.Api/Controllers/AuthController.cs` | `/auth/google`, `/local`, `/me`, `/refresh`, `/logout`, `/switch-tenant/{id}`, `/change-password` + cookies |
| `PDV.Api/Controllers/TenantController.cs` | `POST /tenants` (onboarding, reemite cookie), `DELETE /tenants/current` |
| `PDV.Api/Attributes/RequireModuleAttribute.cs` | Gate 402 por módulo → `IEntitlementService` |
| `PDV.Api/Attributes/RequireEntitlementAttribute.cs` | Gate 402 por capability (chave string) |
| `PDV.Api/Attributes/RequirePermissionAttribute.cs` | Gate 403 por permissão → `IPermissionService` |
| `PDV.Infrastructure/Services/AuthService.cs` | Tokens, Google/local, refresh, `ResolveActiveTenant`, `GetMeAsync` |
| `PDV.Infrastructure/Services/PermissionService.cs` | `RequireAsync(Permission)` (Owner bypass) |
| `PDV.Infrastructure/Services/EntitlementService.cs` | Plano efetivo do tenant, `RequireModule/Entitlement`, `EnsureWithinLimit`, `IsEntitled` |
| `PDV.Infrastructure/Services/TenantContext.cs` / `UserContext.cs` | Leitura de `tenantId` / `userId` do JWT |
| `PDV.Domain/Entities/{User,LocalAuth,ExternalAuth,UserTenant,TenantRole,TenantRolePermission}.cs` | Modelo de auth |
| `PDV.Domain/Enums/{UserRole,Permission}.cs` | Roles e permissões |
| `PDV.Domain/Constants/EntitlementCatalog.cs` | Catálogo de capabilities de billing |

### Frontend
| Arquivo | Responsabilidade |
|---|---|
| `services/api.ts` | Axios: `withCredentials`, `X-Tenant-Id`, interceptor 401→refresh |
| `services/auth.service.ts` | Chamadas `/auth/*` + mapeamento do `/me` |
| `store/slices/auth.slice.ts` | Estado de sessão |
| `components/AuthProvider/index.tsx` | Bootstrap: `/auth/me` no mount |
| `components/RouterGuard/index.tsx` | Guard `public`/`protected`/`onboarding`/`change-password` |
| `components/PermissionGuard/index.tsx` | Guard de permissão por rota |
| `hooks/useUserPermissions.ts` | `hasPermission`, `isOwner`, `isModuleEnabled` |
| `hooks/useCreateTenant.ts` | Onboarding + trial + logo + `setAuth` |
| `pages/Login/index.tsx` | Owner (Google) / Employee (local) |
| `pages/ChangePassword/index.tsx` | Troca de senha obrigatória |
| `router/index.tsx` | Árvore de rotas com guards |
| `constants/modules.ts`, `types/employee.types.ts` | Módulos e permissões |

---

## 17. Melhorias e bugs encontrados

> Levantados na revisão de 2026-07-02. Ordenados por severidade.
> **Itens 1–8 corrigidos em 2026-07-03** (ver marcações ✅). Itens 9–11 seguem em backlog.

### 🔴 Correção / segurança

1. **`mustChangePassword` não é enforced no backend.** O JWT emitido no 1º login local é um token **plenamente válido**; nenhum atributo/middleware bloqueia endpoints quando `MustChangePassword == true`. O bloqueio existe **só no `RouterGuard` do frontend**. Um funcionário com senha temporária pode chamar a API diretamente sem trocar a senha. Além disso, `RefreshAsync` reemite o token **sem** o claim `mustChangePassword`, então após o primeiro refresh o claim some. *Sugestão:* enforcement no backend (middleware/filter) que barra tudo exceto `/auth/change-password` e `/auth/me` enquanto `MustChangePassword`.
   > ✅ **Resolvido (2026-07-03):** `MustChangePasswordMiddleware` (registrado após `UseAuthentication`) barra tudo com `403 MUST_CHANGE_PASSWORD` exceto a allowlist (`/auth/change-password`, `/auth/me`, `/auth/logout`, `/auth/refresh`). `RefreshAsync` reemite o claim enquanto `MustChangePassword` for `true`; `ChangePasswordAsync` reemite o `access_token` **sem** o claim (o `AuthController` grava o cookie), liberando o acesso na hora.

2. **Race de refresh token → logout espúrio.** O interceptor do axios dispara **um refresh por request 401**, sem deduplicação (sem promise compartilhada/mutex). Como `RefreshAsync` faz **rotação single-use**, várias requests que dão 401 juntas (típico no boot da página) disparam refreshes concorrentes: o 1º rotaciona o hash, os demais chegam com o refresh já invalidado → `clearAuth()` → usuário deslogado sem motivo. *Sugestão:* um único `refreshPromise` compartilhado que todas as requests aguardam.
   > ✅ **Resolvido (2026-07-03):** `services/api.ts` mantém um `refreshPromise` compartilhado (módulo-scoped); requests 401 concorrentes aguardam o mesmo `/auth/refresh` e só então fazem retry. Limpo via `.finally`.

3. **`MeResponse.Role` usa `User.Role` (global), mas o JWT usa `UserTenant.Role` (do tenant ativo).** Hoje o impacto é baixo porque um `User` tem um único role global na prática (Owner via Google *ou* Employee via local). Mas é uma inconsistência latente: se um dia o mesmo usuário for Owner de uma loja e Employee de outra, o frontend leria `isOwner = true` (via `/auth/me`) e **liberaria toda a UI**, enquanto o backend enforça as permissões de Employee daquele tenant. *Sugestão:* `/auth/me` retornar o role do **tenant ativo** (consistente com o JWT), não `User.Role`.
   > ✅ **Resolvido (2026-07-03):** `GetMeAsync` retorna o `role` do claim do JWT (= `UserTenant.Role` do tenant ativo); só cai para `User.Role` quando o claim vem vazio (onboarding sem tenant).

### 🟡 Robustez

4. **Sem revogação de token.** O `jti` é gerado mas nunca persistido nem verificado. Logout limpa o refresh token no banco, porém o `access_token` continua válido até expirar (até 8h). Não há blacklist de `jti`. Aceitável para JWT stateless, mas documentar o trade-off (janela de até 8h após logout/troca de role).
   > ✅ **Resolvido (2026-07-03, só documentação):** trade-off documentado em §5 (claim `jti`), §10 (nota de revogação) e cenário 14. Sem blacklist — decisão consciente de manter o JWT stateless.

5. **`Admin` é ambíguo entre as camadas.** `useUserPermissions` trata `Admin` como `isOwner` (acesso total no frontend), mas `PermissionService` **não** libera Admin (só `Owner`) — cairia no caminho de Employee e lançaria `UnauthorizedException`. Enquanto Admin só usar `AdminController` (`[Authorize(Roles="Admin")]`) está ok, mas é uma armadilha para quem adicionar `[RequirePermission]` numa rota compartilhada.
   > ✅ **Resolvido (2026-07-03):** `PermissionService.RequireAsync` agora libera `Owner` **e** `Admin` (`if (role == "Owner" || role == "Admin") return;`), alinhando com o `useUserPermissions` do frontend.

6. **Leitura do `sub` inconsistente.** `AuthController.Me` usa `User.FindFirstValue(ClaimTypes.NameIdentifier)!` (com `!`), enquanto `UserContext` faz fallback defensivo `NameIdentifier ?? "sub"`. Padronizar a leitura do `userId` (idealmente sempre via `IUserContext`) evita `NullReferenceException` caso o mapeamento de claim mude.
   > ✅ **Resolvido (2026-07-03):** `AuthController` injeta `IUserContext` e lê `userContext.UserId` em `Me`/`Logout`/`SwitchTenant`/`ChangePassword` (fallback defensivo `NameIdentifier ?? "sub"`, sem o `!`).

### 🟢 Consistência / manutenção

7. **`IOAuthProvider` é praticamente inerte.** A interface só expõe `ProviderName` e `GoogleOAuthProvider` não faz nada — a validação real do token Google está inline em `AuthService`. Ou a abstração ganha a responsabilidade de validar (para permitir Apple/Facebook), ou é removida para reduzir ruído.
   > ✅ **Resolvido (2026-07-03):** `IOAuthProvider` ganhou `Task<OAuthUserInfo> ValidateAsync(credential)`; a validação do ID Token do Google saiu do `AuthService` para o `GoogleOAuthProvider`. `AuthService.LoginWithGoogleAsync` só orquestra (`provider.ValidateAsync` → `HandleGoogleCallbackAsync`), abrindo caminho para Apple/Facebook.

8. **Nomes/typos no `EntitlementCatalog`.** Constante `AdvancedExpanses` e o comentário "expanses" (deveria ser *expenses*); `AdvancedInventory`, `AdvancedEmployee` e `AdvancedExpanses` estão em `Features` mas **ausentes da lista declarativa `All`** (a UI de assinatura não os exibe, mesmo sendo capabilities válidas). Alinhar chaves e catálogo.
   > ✅ **Resolvido (2026-07-03):** chave renomeada para `advancedExpenses` (backend + frontend + consumidores; `PlanSeeder` reescreve o JSON no startup). As 3 features foram adicionadas a `All` — isto **corrige um bug**: como `PlanJson.ReadEntitlements` filtra por `IsKnown` (montado a partir de `All`), essas chaves eram silenciosamente removidas e **usuários Pro não as recebiam**.

9. **`Permission` sem enforcement de módulo pareado.** O frontend permite marcar permissões (`ManageStock`) mesmo com o módulo (`inventory`) desabilitado no tenant; `permissionToModule` cobre a UI, mas vale garantir no backend que permissão concedida ⇒ módulo habilitado, para não deixar "permissão órfã".

10. **`switch-tenant` não rotaciona o refresh token.** Intencional (só o access_token muda), mas convém documentar que o refresh continua "amarrado" ao usuário e não ao tenant — o que é correto, já que o tenant não faz parte do refresh.

11. **`SameSite=Strict` + origens realmente cross-site.** Em dev/prod com mesmo *site* (localhost, ou subdomínios do mesmo domínio) funciona. Se o frontend e a API forem hospedados em domínios distintos, `Strict` impedirá o envio do cookie em navegações top-level; nesse caso seria necessário `SameSite=None; Secure`. Registrar como ponto de atenção de deploy.
