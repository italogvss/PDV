# Fluxo de Autenticação e Autorização — PDV-Ultra

Este documento explica **como a autenticação e autorização funcionam de ponta a ponta**, desde o login com Google até o acesso a endpoints protegidos por role. Use-o sempre que enfrentar erros 401 ou 403.

---

## Visão Geral

```
[Browser]  ──Google ID Token──▶  [POST /auth/google]
                                        │
                               Valida com Google
                               Cria/atualiza User
                               Monta JWT + RefreshToken
                                        │
                               Set-Cookie: access_token (8h, HttpOnly)
                               Set-Cookie: refresh_token (30d, HttpOnly)
                                        │
[Browser]  ◀── 200 OK ─────────────────┘

[Browser]  ──Cookie automático──▶  [GET /qualquer-endpoint]
                                        │
                               JWT Bearer lido do cookie
                               Claims: sub, tenantId, role, name
                                        │
                               [Authorize] ✅ ou 401/403
```

---

## 1. Login com Google

### Frontend (`pages/Login/index.tsx`)

1. O `GoogleSignInButton` carrega o script GSI do Google e usa `VITE_GOOGLE_CLIENT_ID`.
2. Ao clicar, o Google retorna um **Google ID Token** (JWT emitido pelo Google).
3. O frontend envia esse token para o backend:

```typescript
// auth.service.ts
await authService.loginWithGoogle(credential) // POST /auth/google
const user = await authService.getMe()         // GET /auth/me
dispatch(setAuth(user))
```

4. Se o usuário não tem tenants, navega para `/criar-negocio`; senão vai para `/`.

### Backend (`AuthController.LoginWithGoogle` + `AuthService.LoginWithGoogleAsync`)

1. Valida o Google ID Token usando `GoogleJsonWebSignature.ValidateAsync` (verifica assinatura, audiência e validade).
2. Exige `payload.EmailVerified == true`.
3. Busca o usuário: primeiro por `GoogleId`, depois por email.
4. Se não existe: cria novo `User` com role **Owner** e cria `UserSettings`.
5. Gera JWT interno + RefreshToken, seta os cookies HttpOnly:

```csharp
Response.Cookies.Append("access_token", token, new CookieOptions {
    HttpOnly = true,
    Secure = !isDevelopment,
    SameSite = SameSiteMode.Strict,
    MaxAge = TimeSpan.FromHours(8)
});
```

---

## 2. Estrutura do JWT (access_token)

O JWT gerado pelo `AuthService.GenerateToken` contém:

| Claim | Valor | Usado para |
|---|---|---|
| `sub` | `user.Id` (GUID) | Identificar o usuário |
| `tenantId` | GUID do tenant ativo | Filtro multi-tenant no DbContext |
| `name` | Nome completo | Exibição |
| `role` | `"Owner"` ou `"Employee"` | `[Authorize(Roles = "...")]` |
| `jti` | GUID único | Identificador do token |

**O claim `tenantId` vazio (string vazia) significa que o usuário ainda não tem tenant.**

---

## 3. Como o Backend Lê a Identidade

### JWT Bearer via Cookie

O `Program.cs` configura o JWT para ler o token do cookie `access_token`:

```csharp
options.Events = new JwtBearerEvents
{
    OnMessageReceived = ctx =>
    {
        ctx.Token = ctx.Request.Cookies["access_token"];
        return Task.CompletedTask;
    }
};
```

Não é necessário enviar `Authorization: Bearer ...` — o cookie é lido automaticamente.

### TenantContext

Qualquer serviço que precisa do tenant usa `ITenantContext`:

```csharp
// TenantContext lê o claim "tenantId" do JWT atual
public class TenantContext : ITenantContext
{
    public Guid TenantId => Guid.Parse(
        _httpContextAccessor.HttpContext.User.FindFirstValue("tenantId")
        ?? throw new UnauthorizedAccessException()
    );
}
```

O `DbContext` usa esse `TenantId` em `HasQueryFilter` para filtrar todas as queries automaticamente. **Nunca bypassar isso.**

---

## 4. Autorização por Role

### Roles disponíveis

```csharp
public enum UserRole { Owner, Employee }
```

- **Owner** — dono do negócio; criado automaticamente no primeiro login
- **Employee** — funcionário convidado pelo Owner

### Como aplicar nos controllers

```csharp
[Authorize]                        // Qualquer usuário autenticado
[Authorize(Roles = "Owner")]       // Só Owner do tenant ativo
[Authorize(Roles = "Owner,Employee")] // Qualquer um dos dois (equivale a [Authorize])
```

### Exemplos reais da aplicação

| Endpoint | Autorização | Por quê |
|---|---|---|
| `POST /sales` | `[Authorize]` | Funcionário pode registrar venda |
| `DELETE /sales/{id}` | `[Authorize(Roles = "Owner")]` | Só dono pode cancelar |
| `GET /users` | `[Authorize(Roles = "Owner")]` | Só dono vê/gerencia equipe |
| `POST /tenants` | `[Authorize]` | Qualquer autenticado cria tenant |
| `GET /products` | `[Authorize]` | Qualquer autenticado vê estoque |

---

## 5. Relacionamento User ↔ Tenant (UserTenant)

Um usuário pode pertencer a **múltiplos tenants com roles diferentes**:

```
User A ──── Owner ──── Tenant X (sua própria loja)
User A ──── Employee ── Tenant Y (loja de um amigo)
```

- O JWT carrega o role **do tenant ativo** (`tenantId` no token).
- Para trocar de tenant: `POST /auth/switch-tenant` → gera novo JWT com novo `tenantId` e novo `role`.

---

## 6. Refresh Token

### Fluxo automático no frontend

```typescript
// api.ts — interceptor de resposta
if (error.response?.status === 401) {
    await axios.post('/auth/refresh', {}, { withCredentials: true })
    return retryOriginalRequest // tenta de novo
}
```

### No backend (`AuthService.RefreshAsync`)

1. Lê `refresh_token` do cookie HttpOnly.
2. Faz hash SHA256 e busca o usuário pelo hash.
3. Valida que não expirou (30 dias).
4. Gera novo `access_token` + novo `refresh_token` (rotação completa).
5. Seta cookies novos.

Se o refresh falhar (token expirado ou inválido), o frontend dispara `clearAuth()` e redireciona para `/login`.

---

## 7. Proteção de Rotas no Frontend

### Três guards de rota

```
/login          → PublicRoute   (redireciona para / se já autenticado)
/criar-negocio  → OnboardingRoute (requer auth mas sem tenant)
/*              → ProtectedRoute  (requer auth + tenantId)
```

**ProtectedRoute** — verifica `isAuthenticated` no Redux; enquanto `isLoading=true` mostra spinner.

**PublicRoute** — se `isAuthenticated && tenantId` redireciona para `/`; se `isAuthenticated && !tenantId` redireciona para `/criar-negocio`.

**OnboardingRoute** — requer `isAuthenticated=true` e `tenantId=null`; se tiver tenant, joga para `/`.

### Header X-Tenant-Id

O axios injeta automaticamente o tenant em toda requisição:

```typescript
// api.ts — interceptor de request
config.headers['X-Tenant-Id'] = store.getState().auth.tenantId
```

---

## 8. Diagnóstico de Erros 401 e 403

### 401 Unauthorized

| Causa | Onde resolver |
|---|---|
| Cookie `access_token` ausente ou expirado | Verificar se o refresh está funcionando |
| `tenantId` ausente no JWT (usuário sem tenant) | Usuário precisa criar ou ingressar em um tenant |
| Google token inválido no login | Verificar `VITE_GOOGLE_CLIENT_ID` vs `Authentication:Google:ClientId` |
| Refresh token expirado (>30 dias) | Usuário precisa fazer login novamente |

### 403 Forbidden

| Causa | Onde resolver |
|---|---|
| Usuário é Employee tentando endpoint de Owner | Revisar qual role o usuário tem no tenant ativo |
| Token com `tenantId` diferente do recurso | Trocar para o tenant correto com `/auth/switch-tenant` |
| Usuário não pertence ao tenant do JWT | Verificar tabela `UserTenants` no banco |

### Checklist rápido ao criar um novo endpoint protegido

1. **Qual role pode acessar?** → Coloque `[Authorize]` ou `[Authorize(Roles = "Owner")]`.
2. **Precisa de tenantId?** → Se o serviço usa `ITenantContext`, o JWT precisa ter `tenantId` não-vazio.
3. **O frontend está enviando o cookie?** → `withCredentials: true` no axios.
4. **O header `X-Tenant-Id` está correto?** → Verificar Redux `auth.tenantId`.

---

## 9. Arquivos-Chave

### Backend

| Arquivo | Responsabilidade |
|---|---|
| `Program.cs` | Configuração JWT, CORS, DI |
| `Controllers/AuthController.cs` | `/auth/google`, `/auth/me`, `/auth/refresh`, `/auth/logout`, `/auth/switch-tenant` |
| `Infrastructure/Services/AuthService.cs` | Lógica de token, Google validation, refresh |
| `Infrastructure/Services/TenantContext.cs` | Leitura do `tenantId` do JWT para o DbContext |
| `Middleware/ExceptionMiddleware.cs` | Tratamento de 400/401/404/500 |
| `Domain/Entities/User.cs` | Entidade com `RefreshToken`, `RefreshTokenExpiry`, `LastTenantId` |
| `Domain/Entities/UserTenant.cs` | Join User ↔ Tenant com role por tenant |

### Frontend

| Arquivo | Responsabilidade |
|---|---|
| `services/api.ts` | Axios com `withCredentials`, header `X-Tenant-Id`, interceptor de 401 |
| `services/auth.service.ts` | Chamadas para `/auth/*` |
| `store/slices/auth.slice.ts` | Estado Redux: userId, tenantId, role, isAuthenticated |
| `components/AuthProvider/index.tsx` | Inicialização: chama `/auth/me` no mount |
| `components/ProtectedRoute/index.tsx` | Guard: requer `isAuthenticated` |
| `components/PublicRoute/index.tsx` | Guard: redireciona autenticados |
| `components/OnboardingRoute/index.tsx` | Guard: requer auth sem tenant |
| `pages/Login/index.tsx` | Fluxo de login com Google |

---

## 10. Exemplo Completo: Criar um Endpoint Protegido

### Cenário: `GET /reports/profit` — só Owner pode ver

**Backend:**

```csharp
// ReportsController.cs
[ApiController]
[Route("reports")]
[Authorize]  // todos os endpoints requerem autenticação
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
        => _reportService = reportService;

    [HttpGet("profit")]
    [Authorize(Roles = "Owner")]  // só Owner
    public async Task<IActionResult> GetProfit([FromQuery] DateRangeRequest request)
    {
        var result = await _reportService.GetProfitAsync(request);
        return Ok(result);
    }
}
```

**No serviço (ITenantContext é injetado automaticamente):**

```csharp
// ReportService.cs
public class ReportService : IReportService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public ReportService(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    public async Task<ProfitDto> GetProfitAsync(DateRangeRequest request)
    {
        // O HasQueryFilter já filtra por TenantId automaticamente
        // NÃO precisa de .Where(x => x.TenantId == _tenant.TenantId)
        var sales = await _db.Sales
            .Where(s => s.CreatedAt >= request.From && s.CreatedAt <= request.To)
            .ToListAsync();

        return new ProfitDto { Total = sales.Sum(s => s.Total) };
    }
}
```

**Frontend:**

```typescript
// services/report.service.ts
export const reportService = {
  getProfit: (from: string, to: string) =>
    api.get<ProfitDto>('/reports/profit', { params: { from, to } })
}

// hooks/useProfitReport.ts
export function useProfitReport(from: string, to: string) {
  return useQuery({
    queryKey: ['profit', from, to],
    queryFn: () => reportService.getProfit(from, to)
  })
}
```

O `api` (axios) já envia o cookie e o header `X-Tenant-Id` automaticamente. Se o usuário for Employee, o backend retorna 403. O interceptor de 401 tenta o refresh automaticamente antes de falhar.
