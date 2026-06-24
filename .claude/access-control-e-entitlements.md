# Access Control × Entitlements

Dois eixos **independentes** que costumam ser confundidos. Regra de ouro: se a dúvida é
"o que esse usuário pode ver/fazer?" → **Access Control**. Se é "o que o plano pago libera?"
→ **Entitlements**.

| | Access Control (tenant/role) | Entitlements (plano/assinatura) |
|---|---|---|
| Pergunta | O que o **Employee** pode fazer + módulos que o Owner exibe | O que o **plano** libera |
| Efeito | **Esconde/desabilita UI** | **Bloqueia no backend com 402** — nunca esconde UI |
| Owner | Acesso total (bypassa permissão) | Sujeito ao plano (também recebe 402) |
| Fonte | `/auth/me` → `permissions` + `modules` | `/subscriptions/me` → `entitledModules` + `limits` |

> Os dois usam o mesmo enum `OperationModule` (mesmos 9 módulos), mas a **semântica do "vazio"
> é oposta** — ver a seção de armadilhas.

---

## Eixo 1 — Access Control

**O que é:** permissões por cargo (`TenantRole` → `TenantRolePermission`) + módulos que o Owner
ligou (`TenantSettings.EnabledModulesJson`). Filtra menu, rotas e a matriz de permissões.

**Backend**
- Enums: `PDV.Domain/Enums/Permission.cs`, `OperationModule.cs`
- Mapa **módulo→permissões** (fonte única): `PDV.Domain/Constants/ModuleCatalog.cs`
- Checagem: `PermissionService.RequireAsync` (`Infrastructure/Services/PermissionService.cs`)
  → Owner retorna cedo; Employee valida via `TenantRoleRepository.HasPermissionAsync`
- Aplicação no controller: `[RequirePermission(Permission.X)]` → **401/403**
- Módulos do tenant (regra "vazio = TODOS"): `Application/Helpers/OperationModuleHelper.cs`
- Metadados p/ o frontend: `GET /api/access/metadata` (`Api/Controllers/AccessController.cs`
  + `Application/Helpers/AccessMetadata.cs`)

```csharp
// Controller protegido por permissão (esconde no front + 401 no back)
[RequirePermission(Permission.ManageStock)]
public Task<IActionResult> Update(...) { ... }
```

**Frontend**
- Estado: `auth` slice (`store/slices/auth.slice.ts`) → `permissions`, `modules`
- Hook: `hooks/useUserPermissions.ts` → `hasPermission`, `isModuleEnabled`, `isOwner`
- Rótulos PT-BR: `constants/modules.ts` (`OPERATION_MODULES`), `types/employee.types.ts` (`PERMISSIONS`)
- Relação módulo↔permissão em runtime: `hooks/useAccessMetadata.ts` (backend é a fonte;
  `permissionToModule` local é só fallback de carregamento)

```ts
// Gate de UI: só Access Control. NUNCA billing aqui.
enabled: isModuleEnabled('inventory') && hasPermission('ViewStock')
```

---

## Eixo 2 — Entitlements

**O que é:** o que o plano da assinatura inclui. Bloqueia no backend; no front é **só
informativo** (futuro upsell — não esconde nada).

**Backend**
- Plano: `PDV.Domain/Entities/Plan.cs` → `EntitledModulesJson` + `LimitsJson`
- Seed: `Domain/Constants/PlanSeedData.cs`; Free (sem assinatura): `FreePlanDefaults.cs`
- Limites canônicos: `Domain/Constants/PlanLimits.cs` (`maxEmployees`, `maxProducts`,
  `maxStorageMb`; `-1` = ilimitado)
- Resolução + enforcement: `Infrastructure/Services/EntitlementService.cs`
  - `RequireModuleAsync(module)` → **402** `MODULE_NOT_IN_PLAN`
  - `EnsureWithinLimitAsync(key, count)` → **402** `PLAN_LIMIT_EXCEEDED`
- Leitura dos campos do plano (regra "vazio = NENHUM"): `Application/Helpers/PlanJson.cs`
- Aplicação no controller: `[RequireModule(OperationModule.X)]` → **402**

```csharp
// Módulo do plano (402 se fora do plano) — Owner também é barrado.
[RequireModule(OperationModule.Reports)]
public class ReportsController : ControllerBase { ... }

// Limite por quantidade (chamada explícita no service, antes de criar)
await entitlementService.EnsureWithinLimitAsync(PlanLimits.MaxProducts, await repository.CountAsync());
```

**Frontend**
- Tipos/serviço: `types/subscription.types.ts`, `services/subscription.service.ts`
  (`entitledModules`, `limits`)
- Hook: `hooks/useSubscription.ts` (`useSubscription`, `useSyncSubscriptionToStore`)
- 402 vira toast amigável: `utils/apiError.ts` (`PLAN_GATING_MESSAGES`)
- **Não** participa de `enabled` de query nem esconde menu.

---

## Armadilhas (não repetir)

- **"Vazio" tem sentido oposto.** Tenant: `EnabledModulesJson` vazio = **todos** os módulos
  (`OperationModuleHelper`). Plano: `EntitledModulesJson` vazio = **nenhum** (`PlanJson`).
  Nunca ler módulos de plano com `OperationModuleHelper` — usar `PlanJson.ReadModules`.
- **Billing nunca entra no `enabled` das queries** nem esconde UI. Bloqueio de plano = 402.
- **Dois "modules" diferentes:** `/auth/me` → módulos do tenant (esconde UI);
  `/subscriptions/me` → `entitledModules` do plano (informativo). Não misturar.

## Como adicionar uma regra

- **Nova permissão:** `Permission.cs` → adicionar ao módulo em `ModuleCatalog.cs` →
  rótulo em `PERMISSIONS` (`employee.types.ts`) → `[RequirePermission(...)]` no endpoint.
- **Novo módulo:** `OperationModule.cs` → entrada em `ModuleCatalog.cs` → rótulo em
  `OPERATION_MODULES` (`modules.ts`) → `[RequireModule(...)]` no controller → incluir nos
  planos (`PlanSeedData.cs`) que devem liberá-lo.
- **Novo limite:** chave em `PlanLimits.cs` → valores nos planos (`PlanSeedData.cs`/
  `FreePlanDefaults.cs`) → `EnsureWithinLimitAsync(chave, count)` no service que cria a entidade.
