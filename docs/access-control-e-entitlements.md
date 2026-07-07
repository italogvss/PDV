# Access Control × Entitlements

Dois eixos **independentes** que costumam ser confundidos. Regra de ouro: se a dúvida é
"o que esse usuário pode ver/fazer?" → **Access Control**. Se é "o que o plano pago libera?"
→ **Entitlements**.

| | Access Control (tenant/role) | Entitlements (plano/assinatura) |
|---|---|---|
| Pergunta | O que o **Employee** pode fazer + módulos que o Owner exibe | O que o **plano** libera |
| Efeito | **Esconde/desabilita UI** | **Bloqueia no backend com 402** — nunca esconde UI |
| Owner | Acesso total (bypassa permissão) | Sujeito ao plano (também recebe 402) |
| Fonte | `/auth/me` → `permissions` + `modules` | `/subscriptions/me` → `entitlements` + `limits` |

> Os dois eixos reaproveitam as mesmas 10 chaves de `OperationModule` como "módulo" (coarse),
> mas a **semântica do "vazio" é oposta** — ver a seção de armadilhas. O eixo de Entitlements
> tem ainda um segundo grupo, mais fino, de **Features** (ver abaixo) que não existe no eixo
> de Access Control.

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

**O que é:** o que o plano da assinatura inclui. Bloqueia no backend; no front é, por
convenção, **informativo** — nunca esconde/desabilita UI para features com endpoint próprio
(o 402 barra); para features **sem** endpoint (ex.: painel analítico), é aceitável um
cadeado/CTA client-side (ver "Frontend" abaixo).

Não é só "módulo sim/não": há dois grupos de capability, unificados num **único catálogo**
(`EntitlementCatalog.cs`) e numa única lista persistida:
- **Módulos** (coarse) — hoje concedidos a **ambos** os planos pagos; existem só para manter
  `[RequireModule]` funcionando e como base do catálogo de exibição.
- **Features** (fine) — o diferencial real Essencial × Pro (painel analítico, foto de produto,
  cargos personalizados, relatórios avançados, etc.).

**Backend**
- Catálogo único (módulos + features, rótulos PT-BR): `Domain/Constants/EntitlementCatalog.cs`
  — `EntitlementCatalog.Modules`, `EntitlementCatalog.Features`, `EntitlementCatalog.All`
- Plano: `PDV.Domain/Entities/Plan.cs` → `EntitledModulesJson` (lista única de chaves de
  módulo+feature) + `LimitsJson`
- Seed: `Domain/Constants/PlanSeedData.cs`. **Não existe plano Free permanente** — sem
  assinatura válida, `ResolveForCurrentTenantAsync` devolve zero entitlements (bloqueado)
- Limites canônicos: `Domain/Constants/PlanLimits.cs` (`-1` = ilimitado)
- Resolução + enforcement: `Infrastructure/Services/EntitlementService.cs`
  - `RequireModuleAsync(module)` / `RequireEntitlementAsync(key)` → **402** `MODULE_NOT_IN_PLAN`
    / `NOT_IN_PLAN`
  - `EnsureWithinLimitAsync(key, count)` → **402** `PLAN_LIMIT_EXCEEDED`
  - Comparação de chaves é **case-insensitive** (`ResolvedEntitlement.Has` usa
    `StringComparer.OrdinalIgnoreCase`) — ver armadilha de casing abaixo
- Leitura dos campos do plano (regra "vazio = NENHUM"; chaves sempre normalizadas para
  lowercase ao persistir/ler): `Application/Helpers/PlanJson.cs`
- Aplicação no controller: `[RequireModule(OperationModule.X)]` (módulo) e
  `[RequireEntitlement(EntitlementCatalog.X)]` (feature fina) → **402**

```csharp
// Módulo do plano (402 se fora do plano) — Owner também é barrado.
[RequireModule(OperationModule.Reports)]
// Feature fina a nível de classe: TODO endpoint do controller exige a feature, não só os
// "avançados" — decisão deliberada, não confundir com granularidade por action.
[RequireEntitlement(EntitlementCatalog.AdvancedReports)]
public class ReportsController : ControllerBase { ... }

// Limite por quantidade (chamada explícita no service, antes de criar)
await entitlementService.EnsureWithinLimitAsync(PlanLimits.MaxProducts, await repository.CountAsync());
```

**Frontend**
- Tipos/serviço: `types/subscription.types.ts`, `services/subscription.service.ts`
  (`entitlements: string[]`, `limits`)
- Hook: `hooks/useSubscription.ts`
  - `useSubscription`/`useSyncSubscriptionToStore` — busca e espelha o resumo no Redux
  - `useEntitlements()` → `has(feature)` / `limit(key)`, para features **sem** endpoint próprio
- Catálogo de chaves canônicas (camelCase) + rótulos PT-BR: `constants/entitlements.ts`
  (`FEATURES`, `FEATURE_LABELS`, `PLAN_LIMITS`)
- UI de cadeado/CTA para features sem endpoint: `components/PremiumLock` + `UpsellModal`,
  usando `has(FEATURES.x)` — só para essas; features com endpoint deixam o 402 barrar
- 402 vira toast amigável: `utils/apiError.ts` (`PLAN_GATING_MESSAGES`)
- Comparação sempre case-insensitive: `utils/plans.ts` → `entitlementSet(keys)` (normaliza
  para lowercase antes de comparar) — usado por `useEntitlements`, `PlansGrid` e
  `SubscriptionSection`
- **Não** participa de `enabled` de query (com uma exceção pontual documentada e comentada em
  `hooks/useCustomers.ts` — evita disparar um request que o backend vai 402 de qualquer forma)
  nem esconde menu.

---

## Armadilhas (não repetir)

- **"Vazio" tem sentido oposto.** Tenant: `EnabledModulesJson` vazio = **todos** os módulos
  (`OperationModuleHelper`). Plano: `EntitledModulesJson` vazio = **nenhum** (`PlanJson`).
  Nunca ler módulos de plano com `OperationModuleHelper` — usar `PlanJson.ReadEntitlements`.
- **Billing nunca entra no `enabled` das queries** nem esconde UI. Bloqueio de plano = 402
  (exceção pontual e comentada em `useCustomers.ts`, ver acima).
- **Dois "modules" diferentes:** `/auth/me` → módulos do tenant (esconde UI);
  `/subscriptions/me` → `entitlements` do plano (informativo, módulos + features). Não misturar.
- **Comparação de entitlement precisa ser case-insensitive.** O backend persiste e devolve as
  chaves sempre em lowercase (`PlanJson.SerializeEntitlements`/`ReadEntitlements`), enquanto as
  chaves canônicas de `FEATURES` (`constants/entitlements.ts`) são camelCase
  (`advancedReports`, `customRoles`...). Comparar direto (`array.includes(feature)`) nunca bate
  e passa a bloquear **todo mundo**, inclusive quem já é Pro — foi exatamente esse bug que
  fazia contas Pro verem cadeado/CTA em quase toda feature fina. Sempre normalizar para
  lowercase antes de comparar (`utils/plans.ts` → `entitlementSet()`), tanto no backend
  (`OrdinalIgnoreCase`) quanto no frontend.

## Como adicionar uma regra

- **Nova permissão:** `Permission.cs` → adicionar ao módulo em `ModuleCatalog.cs` →
  rótulo em `PERMISSIONS` (`employee.types.ts`) → `[RequirePermission(...)]` no endpoint.
- **Novo módulo:** `OperationModule.cs` → entrada em `ModuleCatalog.cs` → rótulo em
  `OPERATION_MODULES` (`modules.ts`) → `[RequireModule(...)]` no controller → incluir nos
  planos (`PlanSeedData.cs`) que devem liberá-lo.
- **Nova feature fina (billing):** const + entrada em `EntitlementCatalog.Features`/`All` →
  atribuir aos planos em `PlanSeedData.cs` → `[RequireEntitlement(...)]` no controller (feature
  com endpoint) **ou** `FEATURES`/`FEATURE_LABELS` (`constants/entitlements.ts`) +
  `has(FEATURES.x)` num `PremiumLock` (feature sem endpoint, só cadeado/CTA).
- **Novo limite:** chave em `PlanLimits.cs` → valores nos planos (`PlanSeedData.cs`) →
  `EnsureWithinLimitAsync(chave, count)` no service que cria a entidade.
