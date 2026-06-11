# Fluxo de Autenticação e Autorização — PDV-Ultra

Este documento explica **como a autenticação e autorização funcionam de ponta a ponta**, desde o login até o acesso a recursos protegidos por role e permissão. Use-o sempre que enfrentar erros 401, 403 ou comportamentos inesperados de redirecionamento.

---

## Visão Geral

```
[Browser]  ──Google ID Token──▶  [POST /api/auth/google]   ─┐
[Browser]  ──email + senha──────▶  [POST /api/auth/local]   ─┤
                                                              │
                               Valida credencial              │
                               Cria/atualiza User             │
                               Resolve tenant ativo           │
                               Gera JWT + RefreshToken        │
                                                              │
                               Set-Cookie: access_token (8h, HttpOnly)
                               Set-Cookie: refresh_token (30d, HttpOnly)
                                                              │
[Browser]  ◀── 200 OK ────────────────────────────────────────┘

[Browser]  ──GET /api/auth/me──▶  lê claims do JWT
                                  retorna: userId, tenantId, role,
                                           permissions[], settings,
                                           tenants[], mustChangePassword
                                           │
[Browser Redux]  ◀── setAuth(user) ────────┘
                      ↓
               RouterGuard decide rota:
               mustChangePassword → /trocar-senha
               !tenantId          → /criar-negocio
               OK                 → /

[Browser]  ──Cookie automático──▶  [GET /qualquer-endpoint]
                               JWT lido do cookie access_token
                               Claims: sub, tenantId, role, name, jti
                               [Authorize] ✅ ou 401/403
```

---

## 1. Métodos de Login

### 1a. Login com Google (`POST /api/auth/google`)

**Frontend** (`pages/Login/index.tsx`, tab "Google"):
1. `GoogleSignInButton` carrega o script GSI do Google com `VITE_GOOGLE_CLIENT_ID`.
2. Ao clicar, o Google retorna um **Google ID Token** (JWT emitido pelo Google).
3. O frontend envia para o backend e depois chama `/auth/me`:

```typescript
await authService.loginWithGoogle(credential) // POST /api/auth/google
const user = await authService.getMe()         // GET /api/auth/me
dispatch(setAuth(user))
navigate(user.mustChangePassword ? '/trocar-senha' : user.tenantId ? '/' : '/criar-negocio')
```

**Backend** (`AuthService.LoginWithGoogleAsync`):
1. Valida o Google ID Token via `GoogleJsonWebSignature.ValidateAsync` (assinatura, audiência, expiração).
2. Exige `payload.EmailVerified == true`.
3. Busca usuário: primeiro por `GoogleId` na tabela `ExternalAuth`, depois por email.
4. Se não existe: cria `User` com `Role = Owner` + `UserSettings` (tema claro, textSize 15) + vínculo `ExternalAuth`.
5. Se existe: atualiza nome/avatar e vincula o Google se ainda não estiver vinculado.
6. Gera JWT + RefreshToken → seta cookies HttpOnly.

### 1b. Login local com senha (`POST /api/auth/local`)

Funcionários são criados pelo Owner com senha temporária. No primeiro login, `MustChangePassword = true`.

**Frontend** (`pages/Login/index.tsx`, tab "Entrar com senha"):
```typescript
await authService.loginWithLocal(email, password) // POST /api/auth/local
const user = await authService.getMe()
dispatch(setAuth(user))
navigate(user.mustChangePassword ? '/trocar-senha' : user.tenantId ? '/' : '/criar-negocio')
```

**Backend** (`AuthService.LoginWithLocalAsync`):
1. Busca usuário por email; retorna "Credenciais inválidas" sem revelar se e-mail existe.
2. Verifica `IsActive` e existência de `LocalAuth`.
3. Verifica hash bcrypt da senha.
4. Se `MustChangePassword == true`: JWT inclui o claim `mustChangePassword: "true"`.

### 1c. Troca de senha obrigatória (`POST /api/auth/change-password`)

Rota `/trocar-senha` é exclusiva para este fluxo. Após troca bem-sucedida:
1. Backend zera `MustChangePassword = false` e atualiza o hash.
2. Frontend despacha `setMustChangePassword(false)` e navega para `/`.

---

## 2. Estrutura do JWT (access_token)

O JWT gerado por `AuthService.GenerateToken` contém:

| Claim | Valor | Usado para |
|---|---|---|
| `sub` | `user.Id` (GUID) | Identificar o usuário |
| `tenantId` | GUID do tenant ativo (ou `""`) | Filtro multi-tenant no DbContext |
| `name` | Nome completo | Exibição |
| `role` | `"Owner"` ou `"Employee"` | `[Authorize(Roles = "...")]` no backend |
| `jti` | GUID único | Identificador do token |
| `mustChangePassword` | `"true"` (ausente quando false) | Bloqueio de navegação no frontend |

**`tenantId` vazio** → usuário sem tenant (fluxo de onboarding).

O `role` no JWT vem sempre de `UserTenant.Role` do tenant ativo — nunca de `User.Role` global. Se o usuário não tem tenants, `role` é string vazia.

---

## 3. Como o Backend Lê a Identidade

### JWT Bearer via Cookie

`Program.cs` configura o JWT para ler o token do cookie `access_token`:

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

```csharp
public class TenantContext : ITenantContext
{
    public Guid TenantId => Guid.Parse(
        _httpContextAccessor.HttpContext.User.FindFirstValue("tenantId")
        ?? throw new UnauthorizedAccessException()
    );
}
```

O `AppDbContext` usa esse `TenantId` em `HasQueryFilter` para isolar todas as queries por tenant. **Nunca bypassar sem comentário justificando.**

---

## 4. Modelo de Autorização (duas camadas)

### Camada 1 — Role no JWT (`Owner` / `Employee`)

Controla acesso coarse-grained. Aplicado via atributo nos controllers:

```csharp
[Authorize]                     // Qualquer autenticado
[Authorize(Roles = "Owner")]    // Só Owner do tenant ativo
```

- **Owner**: dono do negócio. Criado automaticamente no primeiro login com Google.
- **Employee**: funcionário convidado pelo Owner. Pode ter múltiplos tenants com roles diferentes.

### Camada 2 — Permissões granulares (`Permission` enum)

16 permissões que controlam acesso a features específicas:

| Permissão | Descrição |
|---|---|
| `SellProducts` | Realizar vendas |
| `CancelSales` | Cancelar vendas |
| `ViewSalesHistory` | Visualizar histórico de vendas |
| `ViewStock` | Visualizar estoque |
| `ManageStock` | Gerenciar estoque |
| `ViewExpenses` | Visualizar despesas |
| `ManageExpenses` | Gerenciar despesas |
| `ViewReports` | Ver relatórios |
| `ManageAppointments` | Gerenciar agendamentos |
| `ViewAppointments` | Visualizar agendamentos |
| `ManageEmployees` | Gerenciar funcionários |
| `ViewEmployees` | Visualizar funcionários |
| `ManageCustomers` | Gerenciar clientes |
| `ViewCustomers` | Visualizar clientes |
| `ManageSuppliers` | Gerenciar fornecedores |
| `ViewSuppliers` | Visualizar fornecedores |

As permissões são agrupadas em **TenantRoles** — papéis customizados por tenant (ex: "Caixa", "Gerente"). Cada `Employee` tem um `RoleId` apontando para um `TenantRole`. O Owner configura as permissões de cada papel na página de Funcionários (matriz de permissões).

```
TenantRole (ex: "Caixa")
  └── TenantRolePermission: SellProducts, ViewStock
Employee
  └── RoleId → TenantRole "Caixa"
```

**Estado atual do enforcement:**
- **Backend**: só a camada 1 está enforced via `[Authorize(Roles = "...")]`. As permissões granulares **ainda não estão checadas no backend**.
- **Frontend**: totalmente enforced via `PermissionGuard` e `useUserPermissions`.

### Como as permissões chegam ao frontend

`GET /api/auth/me` retorna o campo `permissions` somente para Employees:

```csharp
// AuthService.GetMeAsync
if (role == "Employee" && tenantId.HasValue)
{
    var employee = await employeeRepository.GetByUserIdAsync(userId, tenantId.Value);
    var tenantRole = await roleRepository.GetByIdAsync(employee.RoleId);
    permissions = tenantRole.Permissions.Select(p => p.Permission.ToString());
}
```

Owner não recebe `permissions` — o hook `useUserPermissions` trata Owner como tendo acesso a tudo implicitamente:

```typescript
// hooks/useUserPermissions.ts
const hasPermission = (permission: Permission): boolean =>
  isOwner || permissions.includes(permission)
```

---

## 5. Proteção de Rotas no Frontend

### RouterGuard (componente único)

Substituiu os três componentes separados (`ProtectedRoute`, `PublicRoute`, `OnboardingRoute`). Agora é um único `RouterGuard` com prop `type`:

| Tipo | Caminho | Comportamento |
|---|---|---|
| `public` | `/login` | Redireciona autenticados: `mustChangePassword → /trocar-senha`, com tenant → `/`, sem tenant → `/criar-negocio` |
| `protected` | `/*` | Requer `isAuthenticated`; redireciona `mustChangePassword → /trocar-senha` |
| `onboarding` | `/criar-negocio` | Requer auth sem tenant; Employee é redirecionado para `/` |
| `change-password` | `/trocar-senha` | Requer `isAuthenticated + mustChangePassword == true` |

### PermissionGuard

Envolve páginas que requerem permissão específica. Redireciona para `/` se sem permissão:

```typescript
// components/PermissionGuard/index.tsx
export default function PermissionGuard({ permission, children }: Props) {
  const { hasPermission } = useUserPermissions()
  if (!hasPermission(permission)) return <Navigate to="/" replace />
  return <>{children}</>
}
```

Rotas com PermissionGuard no router:

| Rota | Permissão exigida |
|---|---|
| `/vendas` | `SellProducts` |
| `/historico` | `SellProducts` |
| `/estoque` | `ViewStock` |
| `/despesas` | `ViewExpenses` |
| `/funcionarios` | `ManageEmployees` |
| `/relatorios` | `ViewReports` |

### Header X-Tenant-Id

O axios injeta automaticamente o tenant em toda requisição:

```typescript
// services/api.ts — interceptor de request
const { tenantId } = store.getState().auth
if (tenantId) config.headers['X-Tenant-Id'] = tenantId
```

---

## 6. Estado Redux de Autenticação

`auth.slice.ts` armazena:

```typescript
interface AuthState {
  userId: string | null
  tenantId: string | null
  role: 'Owner' | 'Employee' | null
  name: string | null
  email: string | null
  phone: string | null
  document: string | null
  birthDate: string | null
  avatarUrl: string | null
  isAuthenticated: boolean
  isLoading: boolean
  mustChangePassword: boolean
  tenants: TenantListItem[]   // todos os tenants do usuário
  permissions: Permission[]   // vazio para Owner (hasPermission retorna true mesmo assim)
  theme: 'light' | 'dark'    // vindo de UserSettings
  textSize: number            // vindo de UserSettings (default: 15)
}
```

`isLoading: true` é o estado inicial — o `AuthProvider` faz `GET /auth/me` no mount e só então seta `isLoading: false`. O `RouterGuard` exibe spinner enquanto `isLoading == true`.

---

## 7. Relacionamento User ↔ Tenant

```
User A ──── Owner ──── Tenant X (sua própria loja)
User A ──── Employee ── Tenant Y (loja de um amigo)
```

- O JWT carrega o role **do tenant ativo** (`LastTenantId` ou primeiro da lista).
- `ResolveActiveTenant` resolve: usa `User.LastTenantId` se existir, senão o primeiro `UserTenant`.
- Para trocar de tenant: `POST /api/auth/switch-tenant/{tenantId}` → gera novo `access_token` com novo `tenantId` e `role`. Só o access_token é rotacionado (sem novo refresh_token).

---

## 8. Refresh Token

### Fluxo automático no frontend

```typescript
// services/api.ts — interceptor de resposta
if (error.response?.status === 401) {
    await axios.post('/api/auth/refresh', {}, { withCredentials: true })
    return retryOriginalRequest
}
```

### No backend (`AuthService.RefreshAsync`)

1. Lê `refresh_token` do cookie HttpOnly.
2. Faz hash SHA256 e busca usuário pelo hash.
3. Valida que não expirou (30 dias).
4. Gera novo `access_token` + novo `refresh_token` (rotação completa).
5. Seta cookies novos.

Se o refresh falhar (token expirado ou inválido): `clearAuth()` + redirecionamento para `/login`.

---

## 9. Diagnóstico de Erros

### 401 Unauthorized

| Causa | Onde resolver |
|---|---|
| Cookie `access_token` ausente ou expirado | Verificar se o refresh está funcionando |
| `tenantId` ausente no JWT (usuário sem tenant) | Usuário precisa criar ou ingressar em um tenant |
| Google token inválido no login | Verificar `VITE_GOOGLE_CLIENT_ID` vs `Authentication:Google:ClientId` |
| Refresh token expirado (>30 dias) | Usuário precisa fazer login novamente |
| Senha local incorreta | Mensagem genérica intencional — não revelar se e-mail existe |

### 403 Forbidden

| Causa | Onde resolver |
|---|---|
| Employee tentando endpoint `[Authorize(Roles = "Owner")]` | Revisar role do usuário no tenant ativo (`UserTenants`) |
| Token com `tenantId` diferente do recurso | Trocar para o tenant correto com `/auth/switch-tenant` |
| Usuário não pertence ao tenant do JWT | Verificar tabela `UserTenants` no banco |

### Redirecionamento inesperado no frontend

| Sintoma | Causa provável |
|---|---|
| Employee cai em `/` sem ver a página | `PermissionGuard` bloqueou — verificar `permissions[]` no Redux |
| Owner é bloqueado em alguma rota | Não deveria acontecer — `isOwner` bypassa todas as permissões |
| Loop em `/trocar-senha` | `mustChangePassword` está `true` mas a troca falhou silenciosamente |
| Loop entre `/login` e `/criar-negocio` | `tenantId` nulo com `role == Employee` — estado inconsistente |

### Checklist ao criar novo endpoint protegido

1. **Qual role pode acessar?** → `[Authorize]` ou `[Authorize(Roles = "Owner")]`.
2. **Precisa de tenantId?** → Se usa `ITenantContext`, o JWT precisa ter `tenantId` não-vazio.
3. **Qual permissão granular?** → Adicionar `PermissionGuard` na rota do frontend.
4. **O frontend está enviando o cookie?** → `withCredentials: true` no axios (já configurado globalmente em `api.ts`).

---

## 10. Arquivos-Chave

### Backend

| Arquivo | Responsabilidade |
|---|---|
| `Program.cs` | Configuração JWT (leitura do cookie), CORS, DI |
| `Controllers/AuthController.cs` | `/auth/google`, `/auth/local`, `/auth/me`, `/auth/refresh`, `/auth/logout`, `/auth/switch-tenant/{id}`, `/auth/change-password` |
| `Infrastructure/Services/AuthService.cs` | Toda lógica: tokens, Google/local validation, refresh, resolução de tenant/permissões |
| `Infrastructure/Services/TenantContext.cs` | Leitura do `tenantId` do JWT para o DbContext |
| `Domain/Entities/User.cs` | `RefreshToken` (hash SHA256), `RefreshTokenExpiry`, `LastTenantId`, `Settings` |
| `Domain/Entities/UserTenant.cs` | Join User ↔ Tenant com `UserRole` por tenant |
| `Domain/Entities/Employee.cs` | `RoleId` → `TenantRole` (papel customizado do tenant) |
| `Domain/Entities/TenantRole.cs` | Papel customizado com `Permissions` e `IsDefault` |
| `Domain/Entities/TenantRolePermission.cs` | Join `TenantRole` ↔ `Permission` |
| `Domain/Entities/LocalAuth.cs` | Hash bcrypt + `MustChangePassword` |
| `Domain/Entities/UserSettings.cs` | `Theme`, `AccentColor`, `TextSize`, flags de notificação |
| `Domain/Enums/Permission.cs` | 16 permissões granulares |

### Frontend

| Arquivo | Responsabilidade |
|---|---|
| `services/api.ts` | Axios com `withCredentials`, header `X-Tenant-Id`, interceptor de 401 |
| `services/auth.service.ts` | Chamadas para `/auth/*`, mapeamento da resposta do `/me` |
| `store/slices/auth.slice.ts` | Estado Redux: userId, tenantId, role, permissions[], mustChangePassword, theme, textSize |
| `components/AuthProvider/index.tsx` | Inicialização: chama `/auth/me` no mount |
| `components/RouterGuard/index.tsx` | Guard unificado: `public`, `protected`, `onboarding`, `change-password` |
| `components/PermissionGuard/index.tsx` | Guard de permissão granular por rota |
| `hooks/useUserPermissions.ts` | `hasPermission(p)` — Owner sempre true; Employee checa array |
| `types/employee.types.ts` | `Permission` type, `PERMISSIONS` map PT-BR, `TenantRole`, `Employee` |
| `pages/Login/index.tsx` | Login com Google (tab 0) e login local com senha (tab 1) |
| `pages/ChangePassword/index.tsx` | Troca de senha obrigatória no primeiro acesso |

---

## 11. Exemplo Completo: Endpoint com Permissão

### Cenário: `GET /reports/profit` — só quem tem `ViewReports`

**Backend** (hoje só valida Owner vs Employee):

```csharp
[HttpGet("profit")]
[Authorize(Roles = "Owner")]  // TODO: quando enforcement granular for wired, trocar por verificação de Permission
public async Task<IActionResult> GetProfit([FromQuery] DateRangeRequest request)
{
    var result = await _reportService.GetProfitAsync(request);
    return Ok(result);
}
```

**Frontend** (enforcement granular já funciona):

```tsx
// router/index.tsx
{
  path: 'relatorios',
  element: (
    <PermissionGuard permission="ViewReports">
      <ReportsPage />
    </PermissionGuard>
  ),
}
```

```typescript
// hooks/useReports.ts
export function useProfitReport(from: string, to: string) {
  return useQuery({
    queryKey: ['profit', from, to],
    queryFn: () => reportService.getProfit(from, to),
  })
}
```

O `api` (axios) envia cookie e `X-Tenant-Id` automaticamente. O `PermissionGuard` redireciona Employee sem `ViewReports` antes mesmo da request ser feita.
