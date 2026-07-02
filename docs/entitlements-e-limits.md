# Entitlements & Limits (gating de plano)

Guia de manutenção do gating de plano do PDV-Ultra: o que é, onde mora, como flui do
banco até a API/frontend e o passo-a-passo para adicionar ou alterar entradas.

> Escopo: eixo de **billing** (o que cada plano libera). Não confundir com o eixo de
> **Access Control** do tenant (`OperationModule` do tenant / `ModuleCatalog` /
> `TenantSettings.EnabledModulesJson` / permissões de cargo), que é independente.

---

## 1. Conceito

O gating tem **dois eixos**, e só dois:

| Eixo | Tipo | Semântica | Enforcement |
|---|---|---|---|
| **Entitlements** | lista de strings (booleano: tem/não tem) | capabilities que o plano concede | 402 `NOT_IN_PLAN` |
| **Limits** | dicionário `chave → int` (`-1` = ilimitado) | tetos numéricos | 402 `PLAN_LIMIT_EXCEEDED` |

Ponto-chave do modelo: **"módulo" e "feature" são a mesma coisa** — ambos são um
entitlement (capability booleana), diferindo só na granularidade. Por isso não existe um
terceiro eixo de "sub-features": tudo que é "tem ou não tem" vira uma chave de entitlement
no mesmo conjunto. Só os tetos numéricos ficam separados, porque são de outro tipo (`int`).

No modelo definitivo atual: **ambos os planos concedem todos os módulos** (módulo deixou de
ser diferencial de plano); o que separa Essencial × Pro são as **features** (só o Pro) e os
**limites** numéricos.

---

## 2. Onde mora cada coisa (mapa de arquivos)

### Catálogo (fonte única de verdade das chaves)
- **`backend/PDV.Domain/Constants/EntitlementCatalog.cs`** — declara **todas** as chaves de
  entitlement (módulos + features) como `const string`, os agrupamentos
  (`Modules`, `Features`), a lista `All` com metadata (`Key`, `Label` PT-BR, `Group`,
  `IsModule`) e os helpers `ForModule(OperationModule)` e `IsKnown(key)`.
- **`backend/PDV.Domain/Constants/PlanLimits.cs`** — declara as **chaves de limite**
  (`Employees`, `Stores`, `SaleHistoryDays`, `AuditDays`) e a constante `Unlimited = -1`.

### Definição dos planos (valores por tier)
- **`backend/PDV.Domain/Constants/PlanSeedData.cs`** — declara os planos pagos e, para cada
  um, **quais entitlements** (`StarterEntitlements` / `ProEntitlements`) e **quais limites**
  (`StarterLimits` / `ProLimits`) ele concede. É aqui que se decide o que cada plano tem.
  O record `PlanSeed` carrega os campos `Entitlements` e `Limits`.

### Persistência
- **`backend/PDV.Domain/Entities/Plan.cs`** — entidade `Plan` (global, sem tenant). Os
  entitlements e limites são gravados como JSON em dois campos:
  - `EntitledModulesJson` — a lista de entitlements (nome histórico; hoje guarda módulos
    **e** features).
  - `LimitsJson` — o dicionário de limites.
- **`backend/PDV.Infrastructure/Services/PlanSeeder.cs`** — no startup faz **upsert
  idempotente** dos planos (por `ExternalProductId`) a partir do `PlanSeedData`, serializando
  os campos JSON. Como é upsert, **alterar o seed e reiniciar a API já atualiza os planos
  existentes** — não precisa de migration para mudar entitlements/limites.
- **`backend/PDV.Application/Helpers/PlanJson.cs`** — ponte entre o JSON persistido e a
  lógica: `ReadEntitlements` / `SerializeEntitlements` (filtra pelas chaves conhecidas do
  catálogo) e `ReadLimits` / `SerializeLimits`.

### Resolução e enforcement (runtime)
- **`backend/PDV.Application/Interfaces/IEntitlementService.cs`** — contrato + o record
  `ResolvedEntitlement` (com `Entitlements`, `Limits` e o helper `Has(key)`).
- **`backend/PDV.Infrastructure/Services/EntitlementService.cs`** — o coração do runtime:
  - `ResolveForCurrentTenantAsync()` — descobre o **Owner** do tenant atual, lê a
    assinatura viva dele e devolve o `ResolvedEntitlement` (entitlements + limits do plano).
    Sem assinatura válida → tudo vazio (acesso bloqueado; não há Free permanente).
  - `RequireEntitlementAsync(key)` — lança 402 `NOT_IN_PLAN` se a capability não estiver no
    plano. É o **caminho único** de enforcement booleano.
  - `RequireModuleAsync(OperationModule)` — açúcar que delega a `RequireEntitlementAsync`
    usando `EntitlementCatalog.ForModule(...)`. Mantém o atributo `[RequireModule]` funcionando.
  - `EnsureWithinLimitAsync(limitKey, currentCount)` — lança 402 `PLAN_LIMIT_EXCEEDED` se o
    contador atingiu o teto (`-1` = ilimitado, nunca bloqueia).
  - `IsEntitled(subscription)` — define quando a assinatura dá direito (trial não vencido;
    ativa/cancelada dentro do período).

### Atributos de controller
- **`backend/PDV.Api/Attributes/RequireEntitlementAttribute.cs`** — `[RequireEntitlement("chave")]`
  para gatear um endpoint inteiro por uma capability.
- **`backend/PDV.Api/Attributes/RequireModuleAttribute.cs`** — `[RequireModule(OperationModule.X)]`,
  wrapper coarse sobre o mesmo mecanismo.

### Exposição ao frontend
- **`backend/PDV.Application/DTOs/Subscriptions/SubscriptionDtos.cs`** — `SubscriptionResponse`
  e `PlanResponse` expõem `Entitlements` e `Limits`.
- **`backend/PDV.Infrastructure/Services/SubscriptionService.cs`** — `GetMineAsync` (via
  `ResolveForCurrentTenantAsync`) e `GetPlansAsync` (via `PlanJson`) montam esses DTOs.
- **`frontend/src/constants/entitlements.ts`** — espelho leve das chaves (`FEATURES`,
  `PLAN_LIMITS`, `UNLIMITED`) para consumo tipado.
- **`frontend/src/hooks/useSubscription.ts`** — `useEntitlements()` expõe `has(feature)` e
  `limit(key)`, lendo do espelho síncrono no Redux (`auth.subscription`), alimentado por
  `useSyncSubscriptionToStore`. Os tipos ficam em `frontend/src/types/subscription.types.ts`.

---

## 3. Fluxos

### 3.1 Startup / seed
`Program.cs` roda `db.Database.Migrate()` e depois `PlanSeeder.SeedAsync()`. O seeder lê
`PlanSeedData.Plans` e faz upsert de cada `Plan`, gravando `EntitledModulesJson` e
`LimitsJson` via `PlanJson`. Resultado: os planos no banco refletem o código do seed.

### 3.2 Resolução do plano efetivo (por request)
1. Um endpoint gateado dispara `EntitlementService` (via atributo ou chamada no service).
2. `ResolveForCurrentTenantAsync` acha o **Owner** do tenant atual → assinatura viva → `Plan`.
3. Lê `EntitledModulesJson`/`LimitsJson` do plano e devolve `ResolvedEntitlement`.
4. `RequireEntitlementAsync` / `EnsureWithinLimitAsync` decidem passar ou lançar 402.

> Como o entitlement é lido do `Plan` no momento do request, alterar o seed (ou trocar o
> plano da assinatura) reflete **imediatamente** para todos os assinantes.

### 3.3 Enforcement — dois lugares
- **Endpoint inteiro** → atributo no controller (`[RequireEntitlement("chave")]` ou
  `[RequireModule(...)]`). Use quando a capability cobre toda a ação.
- **Condicional dentro do service** → chamar `entitlementService.RequireEntitlementAsync(...)`
  só quando a condição premium ocorrer (ex.: só quando o payload usa o recurso Pro). Use
  quando a mesma ação é permitida no Essencial em modo básico e só a variante avançada é Pro.

### 3.4 Limites numéricos
O **service** conta o estado atual e chama `EnsureWithinLimitAsync(chave, contagem)` antes de
criar. Limites "de leitura" (janela de dias) são aplicados clampando o intervalo de consulta
no próprio service, lendo o valor via `ResolveForCurrentTenantAsync().Limits`.

### 3.5 Consumo no frontend (visão de dados)
`GET /subscriptions/me` devolve `entitlements` + `limits`; o React Query alimenta o espelho
síncrono no Redux; `useEntitlements()` lê dali. O enforcement **real** é sempre o 402 do
backend — o frontend usa os dados só para UX (o code `NOT_IN_PLAN` vira mensagem amigável em
`frontend/src/utils/apiError.ts`).

---

## 4. Como adicionar uma nova FEATURE (entitlement booleano)

1. **Catálogo** (`EntitlementCatalog.cs`): adicione a `const string` da chave, inclua-a na
   lista `Features` e adicione uma entrada em `All` (com `Label` PT-BR, `Group`,
   `IsModule: false`).
2. **Seed** (`PlanSeedData.cs`): inclua a chave em `ProEntitlements` (e/ou onde ela deva
   valer). Não precisa mexer em `StarterEntitlements` se for exclusiva do Pro.
3. **Enforcement**: escolha o lugar
   - endpoint inteiro → `[RequireEntitlement(EntitlementCatalog.SuaChave)]` no controller;
   - condicional → `await entitlementService.RequireEntitlementAsync(EntitlementCatalog.SuaChave)`
     dentro do service, na condição certa.
4. **Frontend** (opcional, só se a UI precisar reagir): adicione a chave em
   `frontend/src/constants/entitlements.ts` (`FEATURES`).
5. **Reinicie a API** para o `PlanSeeder` regravar os planos. Sem migration.

## 5. Como adicionar um novo LIMITE numérico

1. **Chave** (`PlanLimits.cs`): adicione a `const string`.
2. **Seed** (`PlanSeedData.cs`): defina o valor em `StarterLimits` e `ProLimits`
   (`PlanLimits.Unlimited` = -1 para ilimitado).
3. **Enforcement** no service: conte o estado atual e chame
   `entitlementService.EnsureWithinLimitAsync(PlanLimits.SuaChave, contagem)` antes de criar;
   ou, para limite de leitura, leia o valor de `ResolveForCurrentTenantAsync().Limits` e
   aplique o clamp.
4. **Frontend** (opcional): adicione em `frontend/src/constants/entitlements.ts`
   (`PLAN_LIMITS`).
5. **Reinicie a API** (upsert do seed).

## 6. Como alterar o que um plano concede

Edite apenas `PlanSeedData.cs` (`StarterEntitlements` / `ProEntitlements` /
`StarterLimits` / `ProLimits`) e reinicie a API. O upsert do `PlanSeeder` atualiza os planos
existentes; a mudança vale para todos os assinantes na próxima resolução de request.

---

## 7. Checklist rápido

- Chave nova de feature → `EntitlementCatalog` (+`Features` +`All`) → `PlanSeedData` →
  enforcement (atributo ou service) → (frontend opcional) → reiniciar API.
- Limite novo → `PlanLimits` → `PlanSeedData` → `EnsureWithinLimitAsync`/clamp no service →
  (frontend opcional) → reiniciar API.
- Mudar plano → só `PlanSeedData` → reiniciar API.
- Nunca precisa de migration para mudar entitlements/limites (é JSON em coluna já existente).

## 8. Armadilhas comuns

- **Chave fora do catálogo é ignorada**: `PlanJson.ReadEntitlements` filtra por
  `EntitlementCatalog.IsKnown`. Se esquecer de registrar a chave no catálogo, ela some ao ler
  do banco.
- **Assinatura resolve pelo Owner do tenant**, não pelo usuário logado. Entitlements valem
  para a loja inteira.
- **Sem assinatura válida = tudo bloqueado** (não existe Free permanente). Todo módulo/feature
  gateado retorna 402 até haver trial/assinatura ativa.
- **`EntitledModulesJson` tem nome legado**: hoje guarda módulos **e** features. Não renomear
  sem migration; o nome do campo não reflete mais só "módulos".
