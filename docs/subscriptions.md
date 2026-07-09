# Módulo de Assinaturas — Documentação de Referência

> Documento informativo para manutenção do módulo de assinaturas/cobrança do PDV-Ultra.
> Cobre **cartão** (assinatura recorrente) e o **trial PDV-side** (30 dias).
>
> Gateway: **AbacatePay**. _Revalidado em 2026-07-08, correções aplicadas em 2026-07-09._
>
> ⚠️ **Mudança estrutural desde a revisão anterior (2026-07-02):** o fluxo **PIX foi removido**
> do billing de assinatura — hoje o produto é **somente cartão**. O gateway envia apenas
> `Methods: ["CARD"]`, não há eventos `transparent.*`, `GatewayPaymentMethod` só tem `Card` e
> `PixQrDialog` foi excluído. Todo texto sobre PIX dos docs anteriores está **obsoleto**.
>
> ⚠️ Substitui os rascunhos em `.claude/subscription-flow.md` e `.claude/subscription-problems.md`
> (modelo antigo com "plano Free" e trial no gateway) — **obsoletos**.
>
> ✅ **Correções aplicadas em 2026-07-09** (ver §13/§14 para o detalhe por item):
> `SubscriptionExpiredModal` global de conversão (RF-01.4/RF-07.4), TTL de checkout `Pending`
> órfão + CTA de retry (RF-02.7), banner de assinatura Expirada sem preço/recursos de um plano
> que não vale mais (RF-07.5), e remoção do código morto de PIX remanescente no frontend (RF-13.2).

---

## 1. Conceito central: dois eixos de billing

O plano de um tenant define acesso por **dois eixos independentes**, ambos persistidos como JSON no `Plan`:

1. **Entitlements** (`Plan.EntitledModulesJson`) — capabilities **booleanas**. Fonte única: `EntitlementCatalog`.
   Unifica **módulos** (coarse, ex.: `sales`, `inventory` — mantêm `[RequireModule]` funcionando) e
   **features** (fine, ex.: `advancedDashboard`, `customRoles` — diferencial do plano Pro).
   Conceder a chave = liberado; ausência = **402** no enforcement.
2. **Limits** (`Plan.LimitsJson`) — limites **numéricos** (`PlanLimits`): `employees`, `stores`,
   `saleHistoryDays`, `auditDays`. Valor `-1` = ilimitado (`PlanLimits.Unlimited`).

> ⚠️ **Não confundir com o eixo de _acesso_ do tenant** (`OperationModule`/permissões de cargo em
> `/auth/me`). O plano é **billing**: nunca esconde/desabilita UI no frontend — o backend barra com
> **402** e o erro vira toast amigável de upgrade. Ver `CLAUDE.md` (frontend) → "Controle de acesso".

---

## 2. Mapa dos componentes

### Backend

| Camada | Arquivo | Papel |
|---|---|---|
| Controller | `PDV.Api/Controllers/SubscriptionsController.cs` | `/me`, `/plans`, `checkout`, `change-plan`, `cancel` |
| Controller | `PDV.Api/Controllers/PaymentHistoryController.cs` | `GET /api/payments/history` (histórico de cobranças) |
| Controller | `PDV.Api/Controllers/WebhooksController.cs` | Recebe webhooks (`POST /api/webhooks/abacatepay`, anônimo) |
| Service | `PDV.Infrastructure/Services/SubscriptionService.cs` | Orquestra checkout / change-plan / cancel |
| Service | `PDV.Infrastructure/Services/BillingWebhookService.cs` | Aplica evento de webhook ao estado da assinatura/pagamento |
| Service | `PDV.Infrastructure/Services/EntitlementService.cs` | Resolve o plano efetivo do tenant + enforcement 402 |
| Service | `PDV.Infrastructure/Services/PaymentHistoryService.cs` | Mapeia `Payment` → DTO paginado |
| Service | `PDV.Infrastructure/Services/TenantService.cs` | `StartTrialIfEligibleAsync` — concede o trial PDV-side |
| Service | `PDV.Infrastructure/Services/SubscriptionExpiryBackgroundService.cs` | Varredura horária → marca vencidos como `Expired` (canceladas, trials **e checkouts `Pending` órfãos** — RF-02.7) |
| Service | `PDV.Infrastructure/Services/PlanSeeder.cs` | Upsert idempotente dos planos no startup |
| Gateway | `PDV.Infrastructure/Services/Payments/AbacatePay/AbacatePayGateway.cs` | Traduz domínio ↔ AbacatePay (**só cartão**: `Methods:["CARD"]`) |
| Webhook | `PDV.Infrastructure/Services/Payments/AbacatePay/AbacatePayWebhookProcessor.cs` | Valida (secret + HMAC) e normaliza o payload → `PaymentWebhookEvent` |
| Attrs | `PDV.Api/Attributes/{RequireModuleAttribute, RequireEntitlementAttribute}.cs` | Gating 402 nos controllers (delegam ao `IEntitlementService`) |
| Repos | `SubscriptionRepository.cs`, `PaymentRepository.cs`, `BillingWebhookRepository.cs`, `GatewayCustomerRepository`, `PlanRepository` | Persistência (filtro **explícito por `UserId`** — sem query filter de tenant) |
| Catálogo | `PDV.Domain/Constants/{EntitlementCatalog, PlanLimits, PlanSeedData, TrialDefaults, CheckoutDefaults}.cs` | Definição declarativa de planos, capabilities, limites e TTL de checkout `Pending` |

### Frontend

| Arquivo | Papel |
|---|---|
| `pages/Settings/components/SubscriptionSection/index.tsx` | Tela principal: banner do plano, recursos/limites, upsell do Pro, reativação, cancelar |
| `pages/Settings/components/SubscriptionSection/helpers.ts` | `STATUS_CONFIG`, `getStatusLine`, `formatDate`, `MODULE_LABELS` (reexporta helpers de `utils/plans`) |
| `pages/Settings/components/SubscriptionSection/PlanCheckoutDialog/index.tsx` | Modal de checkout (cupom) → redireciona ao gateway (cartão) |
| `pages/Settings/components/SubscriptionSection/PlansDialog/index.tsx` | Modal de escolha de plano (reassinatura) → abre o checkout do plano escolhido (usa `PlansGrid`) |
| `pages/SubscriptionReturn/index.tsx` | Retorno pós-checkout (`/assinatura/retorno`) — polling de `/me` (3s, **timeout 60s**, com retry) |
| `pages/Settings/components/BillingPaymentsSection/*` | Histórico de faturas (`GET /payments/history`) |
| `components/SubscriptionExpiredModal/index.tsx` | Modal global de conversão (RF-01.4/RF-07.4) — montado no `DashboardLayout`, aparece para Owner/Admin sempre que `subscription.status === 'Expired'`; CTA "Ativar plano" leva a `/configuracoes?tab=assinatura` |
| `hooks/useSubscription.ts` | React Query: `useSubscription`, `usePlans`, `useStartCheckout`, `useChangePlan`, `useCancelSubscription`, `useEntitlements`, `useSyncSubscriptionToStore` |
| `services/subscription.service.ts` | HTTP + mapeamento backend↔frontend |
| `types/subscription.types.ts` | Contrato (`Subscription`, `Plan`, `SubscriptionStatus`, `PaymentMethod`) |
| `utils/plans.ts` | `formatPrice/Limit`, `planCycle`, `cycleSuffix`, `shortPlanName`, `entitlementSet`, `FEATURE_KEYS`, `LIMIT_ORDER` |
| `constants/entitlements.ts` | Espelho das chaves de FEATURE + LIMIT + rótulos PT-BR |

> **Removido do frontend:** `PixQrDialog` (não existe mais). `PlanCheckoutDialog` e `startCheckout`
> **não enviam mais `method`** — o backend sempre usa cartão.

---

## 3. Modelo de dados

### `Subscription` (`PDV.Domain/Entities/Subscription.cs`)
Uma assinatura **viva por `User` (Owner)** — cobre todas as lojas dele. **NÃO é tenant-scoped**
(sem query filter); os repositórios filtram por `UserId` explicitamente.

| Campo | Significado |
|---|---|
| `UserId` | Owner dono da assinatura |
| `PlanId` / `Plan` | Plano atual (fonte de entitlements/limits) |
| `Status` | `Pending → Trialing/Active → Canceled → Expired` (enum sem `PastDue`) |
| `Method` | `GatewayPaymentMethod` — **só `Card`** (enum tem um único valor hoje) |
| `IsRenewable` | `true` no checkout de cartão; `false` no trial PDV-side |
| `Provider` | `"AbacatePay"` (string **vazia** no trial PDV-side, que não toca o gateway) |
| `GatewaySubscriptionId` | `subs_...` — capturado nos eventos `subscription.*`. **Necessário p/ change-plan (gateway) e cancel** |
| `GatewayCustomerId` | `cust_...` |
| `TrialEndsAt` | Fim do trial |
| `CurrentPeriodEnd` | Fim do período vigente (pago ou trial) — base do entitlement |
| `CanceledAt` | Quando foi cancelada |

### `Payment` (`PDV.Domain/Entities/Payment.cs`)
Histórico de cobranças, scoped por `UserId`.

| Campo | Observação |
|---|---|
| `GatewayChargeId` | `bill_...` — **chave de idempotência** |
| `SubscriptionId` / `PlanId` | Vínculo com a assinatura/plano |
| `Kind` | `CardSubscription` \| `OneOffCheckout` (o `PixSubscription` **não existe mais**) |
| `Method` | `Card` |
| `Status` | `Pending → Paid` (ou `Refunded`/`Disputed`/`Cancelled`) |
| `AmountCents`, `PaidAt`, `ReceiptUrl`, `CouponCode` | Dados da cobrança |
| `CardLastFour`, `CardBrand` | Cartão usado (do webhook `data.payerInformation.CARD`) |
| `PeriodStart` / `PeriodEnd` | Período coberto — preenchido via `SetPeriod` em `CompleteChargeAsync` |

### Enums (`PDV.Domain/Enums`)
- `SubscriptionStatus`: `Pending, Trialing, Active, Canceled, Expired`
  (o `/me` também devolve a string sintética **`"None"`** quando não há assinatura)
- `PaymentStatus`: `Pending, Paid, Refunded, Disputed, Expired, Cancelled`
- `PaymentKind`: `CardSubscription, OneOffCheckout`
- `GatewayPaymentMethod`: **`Card`** (único valor)
- `BillingPeriod`: `Monthly, Annual`
- `PaymentWebhookType` (`PDV.Application/DTOs/Payments/GatewayModels.cs`): `CheckoutCompleted,
  CheckoutRefunded, CheckoutDisputed, SubscriptionTrialStarted, SubscriptionCompleted,
  SubscriptionRenewed, SubscriptionCancelled, SubscriptionPlanChanged, Unknown` (**sem eventos PIX/transparent**)

### Entidades de apoio
- `GatewayCustomer` — `cust_...` por usuário/provider (evita recriar cliente no gateway).
- `WebhookEvent` — idempotência: `(Provider, EventId)` já processado → 200 sem reprocessar.

---

## 4. Catálogo de planos (semente)

`PlanSeeder` faz **upsert idempotente por `ExternalProductId`** no startup. Os produtos já existem no
AbacatePay com o ciclo correto. **Nenhum plano usa `trialDays` no gateway** — o trial é PDV-side.

| Plano | `ExternalProductId` (prod_) | Preço | Ciclo | Slug (landing `?plano=`) | Entitlements | Limites |
|---|---|---|---|---|---|---|
| Essencial Mensal | `…Lzwzn…Rq5uX` | R$ 29,99 | Mensal | `essencial-mensal` | Todos os módulos, **0 features** | emp 2 · lojas 1 · vendas 90d · auditoria 7d |
| Essencial Anual | `…1Fq6L…6FWX` | R$ 299,99 | Anual | `essencial-anual` | idem | idem |
| Profissional Mensal | `…czbpx…6XGZ` | R$ 49,99 | Mensal | `profissional-mensal` | Todos os módulos **+ todas as features** | emp ∞ · lojas 5 · vendas ∞ · auditoria ∞ |
| Profissional Anual | `…wmAAU…f4cL` | R$ 499,99 | Anual | `profissional-anual` | idem | idem |

> **Modelo definitivo:** ambos os planos concedem **todos os módulos** (módulo não é diferencial).
> O diferencial Essencial × Pro são as **features** (só no Pro) + os **limites numéricos**.
> Hoje o `EntitlementCatalog.Features` tem **13 chaves** (o comentário "9 FEATURES" no código está
> desatualizado — ver §13 #11). O anual embute "2 meses grátis" (12× mensal vs. preço anual).

---

## 5. Resolução do plano efetivo (`EntitlementService`)

`ResolveForCurrentTenantAsync()`:
1. Descobre o **Owner** do tenant atual (`userTenantRepository.GetOwnerUserIdAsync`).
   Sem tenant (onboarding pendente) → usa o **próprio `userContext.UserId`**.
2. Busca a assinatura viva do Owner (`GetLiveByUserIdAsync` — `IsActive`, mais recente).
3. Se `IsEntitled(sub)` → `Entitlements`/`Limits` vêm do `Plan` da assinatura.
4. **Senão → SEM acesso** (não há Free): `Plan = null`, `Entitlements = []`, `Limits = {}`.
   Todo `[RequireModule]`/`[RequireEntitlement]` retorna **402**. A `Subscription` ainda pode ser
   devolvida (ex.: expirada) para a UI mostrar status.

`IsEntitled(sub)`:
- `Trialing` → `TrialEndsAt` nulo ou no futuro
- `Active` **ou** `Canceled` → `CurrentPeriodEnd` nulo ou no futuro *(cancelado mantém acesso até o fim do período pago; **Active com período vencido deixa de ser entitled mesmo sem job** — ver §9)*
- demais (`Pending`, `Expired`) → sem direito

**Enforcement (código real):**
- `RequireModuleAsync(module)` → `RequireEntitlementAsync(EntitlementCatalog.ForModule(module))` → **402 `NOT_IN_PLAN`**
- `RequireEntitlementAsync(key)` → **402 `NOT_IN_PLAN`** (feature/módulo fora do plano)
- `EnsureWithinLimitAsync(limitKey, currentCount)` → **402 `PLAN_LIMIT_EXCEEDED`** (limite atingido; `-1` = ilimitado, nunca barra)

> ⚠️ Módulo e feature compartilham o mesmo código **`NOT_IN_PLAN`** (não existe `MODULE_NOT_IN_PLAN`
> no código — a menção no `backend/CLAUDE.md` está desatualizada, ver #15). O `utils/apiError.ts`
> mapeia só `NOT_IN_PLAN`/`PLAN_LIMIT_EXCEEDED` — a entrada `MODULE_NOT_IN_PLAN` (morta, o backend
> nunca a emite) foi removida em 2026-07-09 (RF-13.2).

---

## 6. Endpoints

| Método | Rota | Auth | Service |
|---|---|---|---|
| GET | `/api/subscriptions/me` | Autenticado (qualquer) | `GetMineAsync` |
| GET | `/api/subscriptions/plans` | Autenticado | `GetPlansAsync` |
| POST | `/api/subscriptions/checkout` | Owner,Admin | `StartCheckoutAsync` |
| POST | `/api/subscriptions/change-plan` | Owner,Admin | `ChangePlanAsync` |
| POST | `/api/subscriptions/cancel` | Owner,Admin | `CancelAsync` |
| GET | `/api/payments/history?page=&pageSize=` | Owner,Admin | `PaymentHistoryService.GetHistoryAsync` |
| POST | `/api/webhooks/abacatepay?webhookSecret=` | Anônimo (secret+HMAC) | `BillingWebhookService.ProcessAsync` |

### `/me` → `SubscriptionResponse`
Campos: `planId`, `planName`, `status`, `method`, `isRenewable`, `trialEndsAt`, `currentPeriodEnd`,
`canceledAt`, `entitlements[]`, `limits{}`, `hasUsedTrial`.
`planId == null` ⇒ **sem assinatura válida** (acesso bloqueado; não é "Free").
O `useSyncSubscriptionToStore` espelha um resumo no `auth` slice (Redux) para banner global e
gating síncrono de features sem endpoint (`useEntitlements`).

### `checkout` → `StartCheckoutResponse`
Hoje devolve apenas **`{ checkoutUrl }`** (o campo `pix` foi removido). O frontend faz
`window.location.href = checkoutUrl`.

---

## 7. Cenários

### 7.1 — TRIAL PDV-side (30 dias, sem cartão)

Concedido em `TenantService.StartTrialIfEligibleAsync` na **criação do tenant**:
- Condições: veio `?plano=<slug>` da landing **e** `!user.HasUsedTrial` **e** não há assinatura viva.
- Cria `Subscription` `Trialing`, `Provider = ""`, `IsRenewable = false`,
  `TrialEndsAt = CurrentPeriodEnd = now + 30d` (`TrialDefaults.DurationDays`). Marca `user.HasUsedTrial = true`.
- **Não chama o gateway** → sem `GatewaySubscriptionId`, sem `Payment`.
- Slug ausente/desconhecido → onboarding segue **sem trial** (não falha) → app **bloqueado (402)** até assinar.
- Fim do trial: `SubscriptionExpiryBackgroundService` marca `Expired` (§9).

> ⚠️ O `Method` é `Card` (único valor do enum) mas não há `GatewaySubscriptionId`. O upgrade durante
> o trial é tratado no backend como **troca local do plano** (ver §7.5 e #1) — funciona.

### 7.2 — CRIAR CHECKOUT (cartão)

**Frontend:** `SubscriptionSection` (upgrade) ou `PlansDialog` (reassinatura) → `PlanCheckoutDialog`
(cupom opcional) → `useStartCheckout` monta `returnUrl` (default `/configuracoes?tab=assinatura`) e
`completionUrl = /assinatura/retorno` e chama `POST /checkout`. Backend devolve `checkoutUrl` →
`window.location.href`. Após pagar, o gateway redireciona para `/assinatura/retorno`
(`SubscriptionReturnPage`), que faz **polling de `/me` a cada 3s (timeout 60s, com botão "Verificar
novamente")** até `Active`/`Trialing`.

**Backend — `StartCheckoutAsync`:**
- Plano existe localmente e no gateway (`CheckIfPlanExistsAsync`).
- Se plano tem `TrialDays` no gateway **e** `user.HasUsedTrial` → `BusinessException` (na prática os
  planos têm `TrialDays = null`, então este ramo não dispara hoje).
- **Bloqueia** se já houver assinatura `Active`/`Trialing` **e** entitled ("ativa até {data}").
  ⚠️ Isso inclui o **trial vigente** → um usuário em trial **não consegue** contratar/pagar antes do
  fim do trial por este endpoint (ver §7.10 e #12). `Canceled`/`Expired`/`Pending` **não bloqueiam** → reativação/retry.
- `EnsureCustomerAsync` → garante `GatewayCustomer` (`cust_...`) e sincroniza Document/Phone no `User`.
- Reaproveita a `Subscription` do usuário (uma por usuário): `Status = Pending`, `Method = Card`,
  `IsRenewable = true`, `CanceledAt = null`, `GatewayCustomerId`, `PlanId`.
- `metadata = { userId, planId, subscriptionId }`; `gateway.CreateSubscriptionCheckoutAsync`
  (`Methods: ["CARD"]`, `ExternalId = sub.Id`) → `bill_...` + URL.
- Persiste a `Subscription` + cria `Payment` `Pending` (`Kind=CardSubscription`, `GatewayChargeId=bill_`).
- **Resposta:** `{ checkoutUrl }`. **Ativação vem por webhook** (§7.4), não pela resposta.

> ✅ **Checkout abandonado (RF-02.7).** Se o usuário nunca voltar do gateway, a `Subscription`/o
> `Payment` ficam `Pending` indefinidamente. Duas correções: (1) `SubscriptionSection` agora expõe
> um card "Finalize sua assinatura" / CTA "Tentar novamente" para `status === 'Pending'` (o
> `StartCheckoutAsync` já permitia retry — só faltava o CTA); (2) o
> `SubscriptionExpiryBackgroundService` expira automaticamente `Subscription`s `Pending` há mais de
> `CheckoutDefaults.PendingTtlHours` (24h) para `Expired` (libera nova tentativa e aciona o
> `SubscriptionExpiredModal`, ver §7.9) e cancela (`Cancelled`) o `Payment` `Pending` órfão
> correspondente, para não poluir o histórico de cobranças com um "Pendente" eterno.

### 7.3 — ATIVAÇÃO (pós-pagamento, via webhook)

**Cartão (cobrança imediata):**
- `checkout.completed (PAID)` → `ApplyCheckoutCompletedAsync` → `CompleteChargeAsync` marca o
  `Payment` (`bill_`) como `Paid` (PaidAt, ReceiptUrl, cartão, `PeriodStart/End`). Se PENDING (ou trial
  gateway, inativo hoje) → só captura o cartão no pendente.
- `subscription.completed` → `ApplySubscriptionActive`: captura `subs_`, `Status = Active`,
  `CurrentPeriodEnd = NextPeriodEnd(now, plan)` (**mensal → +1 mês; anual → +1 ano**).

### 7.4 — MUDAR DE PLANO (upgrade/downgrade)

**Frontend:** o CTA "Fazer upgrade agora" aparece quando `isLiveCard` (`isLive && method === 'Card'`) —
o que **inclui o trial PDV-side** (method default `Card`). Chama `useChangePlan.mutate(planId)` →
`POST /change-plan` (**sem modal de confirmação** — ver #5). Toast "Plano alterado." + invalida `/me`.

**Backend — `ChangePlanAsync`:**
- Exige sub `Active`/`Trialing` (senão `BusinessException "Nenhuma assinatura ativa para trocar."`).
- Plano novo ≠ atual (senão `"Você já está neste plano."`).
- **Trial PDV-side (`Trialing` + sem `GatewaySubscriptionId`):** troca **só o plano local**, preserva
  `TrialEndsAt`/`CurrentPeriodEnd`, **não chama o gateway**. (Resolve o antigo bug #1.)
- Fora desse caso, exige `GatewaySubscriptionId` (senão `"Troca de plano disponível apenas para
  assinaturas já ativadas no gateway."`).
- Fora de trial: não pode trocar para plano com `TrialDays`.
- `gateway.ChangeSubscriptionPlanAsync(subs_, novoProduto, 1)` → `sub.PlanId = novo` **imediatamente**.
- Em trial-gateway (inativo hoje): recalcula `TrialEndsAt`/`CurrentPeriodEnd` se o novo plano tem `TrialDays`.

**Webhook `subscription.plan_changed` → `ApplyPlanChangedAsync`** (confirmação idempotente):
captura `subs_`, reconcilia `PlanId` via `evt.ProductId`, **não altera datas**, registra cobrança
(`CompleteChargeAsync`) se `PAID`.

### 7.5 — RENOVAR (automático, cartão)

Sem endpoint. No fim do ciclo o gateway cobra e envia:
- `checkout.completed (PAID)` (gerado internamente, **sem `externalId`/metadata**):
  `ResolveSubscriptionAsync` cai no fallback por **`CustomerId` (`cust_`)**; `ResolvePaymentAsync` não
  acha `Payment` (novo `bill_`) → `CompleteChargeAsync` **cria um `Payment` já `Paid`** (idempotente).
- `subscription.renewed` → `ApplyRenewed`: `Status = Active`, `CurrentPeriodEnd = NextPeriodEnd(now, plan)`.

> ⚠️ **Falha de renovação não tem tratamento dedicado** (não há mais `PastDue`, nem dunning, nem job
> que expire `Active` vencido). Se a renovação não chegar, a sub fica `Active` com `CurrentPeriodEnd`
> no passado → `IsEntitled` retorna `false` (acesso corretamente bloqueado), mas o banner ainda diz
> "Ativo / Renovação em {data passada}". Ver #13 e RF-05.4.

### 7.6 — CANCELAR

**Frontend:** botão "Cancelar plano" quando `isPaid && isLive`. `ConfirmDialog` com mensagem por
estado (trial → aviso forte de perda de acesso + exclusão da loja em 30 dias + link para exportar
dados; ativa → "não renova, acesso até {data}") → `useCancelSubscription.mutate()` → `POST /cancel`.
O endpoint devolve `{ accessRevoked }`: **true** (trial) → `authService.logout()` + `clearAuth()` +
`clearStoredPlanSlug()` + redirect para `VITE_LANDING_URL`; **false** (ativa) → toast + invalida a query.

**Backend — `CancelAsync` → `CancelSubscriptionResult(AccessRevoked)`:**
- Se `GatewaySubscriptionId` presente → `gateway.CancelSubscriptionAsync` **primeiro**.
- **Em trial (`Trialing`):** bloqueio imediato com **remoção FÍSICA** (hard delete) da `Subscription`
  e dos `Payment` da sub (FK: pagamentos antes). Exceção justificada ao soft delete. Além disso,
  **desativa todas as lojas ativas do Owner** (`IsActive=false`, `ScheduledDeletionAt = now+30d` →
  excluídas pelo `TenantDeletionBackgroundService`). `User.HasUsedTrial` permanece `true`. Retorna
  `AccessRevoked = true`.
- **Pós-trial (`Active`):** `Status = Canceled`, `CanceledAt = now`, **`CurrentPeriodEnd` preservado**
  → acesso mantido até o fim do período. Retorna `AccessRevoked = false`. **Não** há janela de
  reembolso.

**Webhook `subscription.cancelled` → `ApplyCancelled`:** `Status = Canceled`, `CanceledAt ??= now`
(idempotente com o cancel manual). Cancelamento em trial: sub já removida → resolve nada → no-op
(o `WebhookEvent` ainda é gravado, preservando idempotência).

### 7.7 — REATIVAR

Sem endpoint dedicado — reativação por **novo checkout** reaproveitando a `Subscription`:
- `StartCheckoutAsync` bloqueia apenas `Active`/`Trialing` entitled; `Canceled`/`Expired`/`Pending` → permitido.
- Frontend: card "Reative sua assinatura" / "Assine para continuar usando" (`showResubscribe`) →
  `PlansDialog` → `PlanCheckoutDialog`.
- Reativar **dentro** do período pago (Canceled, `CurrentPeriodEnd` futuro): a UI avisa
  ("Reativar agora gera uma nova cobrança imediata", `hasRemainingAccess`) — resolve o antigo #6.

### 7.8 — REEMBOLSO / CHARGEBACK

`checkout.refunded`/`checkout.disputed` → `ApplyReversed`:
`Payment.Status = Refunded/Disputed`, `Subscription.Status = Expired`, `CurrentPeriodEnd = now`
(acesso cai imediatamente).

### 7.9 — SEM ASSINATURA (None) / EXPIRADO — app bloqueado

Sem assinatura viva (nunca assinou, sem trial) ou expirada → `EntitlementService` resolve
`Entitlements=[]`/`Limits={}` → **todo endpoint gateado retorna 402**. Não há guard bloqueando
rotas (o usuário continua navegando e recebe toasts 402 por recurso), mas desde a correção de
2026-07-09 o `SubscriptionExpiredModal` (global, montado no `DashboardLayout`) aparece para o
Owner/Admin **sempre que `status === 'Expired'`** — chama para ativar um plano
(`/configuracoes?tab=assinatura`), dispensável por sessão ("Agora não"/X). A `SubscriptionSection`
(Configurações) continua sendo quem detalha o estado e oferece a reativação em si. Ver RF-07.4.

### 7.10 — TRIAL → PAGO (conversão)

Durante o trial não há caminho de checkout: `StartCheckoutAsync` bloqueia `Trialing` entitled, e o
CTA de upgrade só troca o plano **local** (sem cobrança). Isso **não mudou** — foi uma decisão
consciente manter o bloqueio durante o trial em vez de abrir checkout antecipado. Em vez disso, a
correção de RF-01.4 (2026-07-09) foi cobrir o momento em que o trial **vence**: assim que a
`Subscription` vira `Expired`, o `SubscriptionExpiredModal` (§7.9) aparece imediatamente chamando
para assinar — o usuário ainda perde o acesso no intervalo até o fim do trial, mas não fica sem
nenhum aviso ativo pedindo a conversão.

---

## 8. Pipeline de webhook (entrada)

`WebhooksController.AbacatePay`:
1. Valida `webhookSecret` da query (`VerifySecret`, tempo-constante). Falha → **401**.
2. Lê o corpo **raw** (`EnableBuffering`).
3. Valida **HMAC-SHA256** do corpo com a chave pública fixa do AbacatePay (header `X-Webhook-Signature`). Falha → **403**.
4. `processor.Parse(rawBody)` → `PaymentWebhookEvent` normalizado.
5. **Idempotência:** `ProcessedEventExistsAsync(provider, eventId)` → **200** sem reprocessar.
6. `billingService.ProcessAsync(evt)` aplica o estado **e** grava o `WebhookEvent` (Processed) no
   **mesmo `SaveChangesAsync`** — atômico.
7. Erro no processamento → **500** (nada persistido → gateway pode retentar).

### Normalização (`AbacatePayWebhookProcessor.MapToEvent`)
- **EventId:** `subscription.*` traz `log_...`; `checkout.*` não têm → **hash SHA256 (hex) do corpo**.
- **ChargeId:** `checkout.id` (`bill_`).
- **ExternalId:** `checkout.externalId ?? payment.externalId` (= nossa `Subscription.Id`; **null** em `subscription.completed`/`renewed`).
- **AmountCents:** cascata `checkout.paidAmount → payment.paidAmount → checkout.amount`.
- **Status:** `subscription.cancelled` usa `subscription.status` (`CANCELLED`); demais → `checkout.status`.
- **CustomerId:** `customer.id` (canônico; `checkout.customerId` pode divergir — nunca primário).
- **Cartão:** `data.payerInformation.CARD.number/brand`. **ProductId** e **TrialEndsAt** também extraídos.

### Resolução da `Subscription` (`ResolveSubscriptionAsync`, em ordem)
1. `metadata.subscriptionId` → 2. `ExternalId` (= `Subscription.Id`) → 3. `subs_` do gateway →
4. `metadata.userId` → 5. `CustomerId` (`cust_`, usado em renovações sem externalId).

### Resolução do `Payment`
Estritamente por `GatewayChargeId` (`bill_`). **Sem fallback** por "pendente mais recente"
(evita marcar por engano um pendente avulso; numa renovação não há `Payment` pré-criado).

---

## 9. Expiração automática (`SubscriptionExpiryBackgroundService`)

`BackgroundService` singleton; varredura **a cada 1h** num scope próprio (repo/DbContext scoped):
- `ExpireCanceledPastPeriodAsync(now)` → `Canceled` com `CurrentPeriodEnd < now` → `Expired`.
- `ExpireTrialingPastEndAsync(now)` → `Trialing` com `TrialEndsAt < now` → `Expired`.
- `ExpireStalePendingAsync(cutoff)` (`ISubscriptionRepository`) → `Pending` há mais de
  `CheckoutDefaults.PendingTtlHours` (24h) → `Expired` (checkout abandonado, libera nova tentativa).
- `IPaymentRepository.ExpireStalePendingAsync(cutoff)` → `Payment` `Pending` no mesmo corte de tempo
  → `Cancelled` (evita "Pendente" eterno no histórico de cobranças). Ver RF-02.7.

Todos varrem **todos os usuários** (sem query filter de tenant, por design). Erros são logados
(`try/catch`) sem derrubar o serviço.

> ⚠️ **`Active` vencido NÃO é varrido** — não há job que mova `Active`→`Expired`. O acesso é barrado
> corretamente por `IsEntitled` (período passado), mas o `Status` permanece `Active` até um webhook
> mudá-lo (renovação/cancelamento). Ver §7.5 e RF-05.4.

---

## 10. Eventos × ações (resumo)

| Evento (AbacatePay) | Handler | Subscription | Payment |
|---|---|---|---|
| `checkout.completed` (PAID) | `ApplyCheckoutCompletedAsync` | — | marca/cria `Paid` + `PeriodStart/End` |
| `checkout.completed` (PENDING) | `ApplyCheckoutCompletedAsync` | — | captura cartão no pendente |
| `subscription.completed` | `ApplySubscriptionActive` | `Active`, `NextPeriodEnd`, `subs_` | — |
| `subscription.trial_started` | `ApplyTrialStarted` | `Trialing`, `TrialEndsAt`, `subs_`, `HasUsedTrial` | — |
| `subscription.renewed` | `ApplyRenewed` | `Active`, `NextPeriodEnd`, `subs_` | (cobrança vem no `checkout.completed`) |
| `subscription.plan_changed` | `ApplyPlanChangedAsync` | reconcilia `PlanId`, **sem alterar datas** | cria `Paid` se cobrado |
| `subscription.cancelled` | `ApplyCancelled` | `Canceled`, `CanceledAt` | `Cancelled` (se resolvido) |
| `checkout.refunded` \| `checkout.disputed` | `ApplyReversed` | `Expired`, `CurrentPeriodEnd = now` | `Refunded`/`Disputed` |

> `NextPeriodEnd(from, plan)` = `AddYears(1)` se `BillingPeriod.Annual`, senão `AddMonths(1)`.
> ⚠️ `subscription.trial_started` do **gateway** só ocorreria se um produto tivesse `trialDays` — hoje
> os planos não têm, então esse fluxo está **inativo** (o trial é PDV-side). Eventos PIX/`transparent.*`
> **não existem mais**.

---

## 11. Ciclo de vida (`Subscription.Status`)

```
  Landing ?plano=<slug>          checkout (cartão)            webhook
  ───────────────▶ Trialing*     (sem sub) ──▶ Pending ──▶ Active ◀── renewed
       (PDV-side, 30d)               │            │            │
            │                        │            │      cancel │ (pós-trial)
       expira (job)                  │            │            ▼
            ▼                        │            │         Canceled ──(vence, job)──▶ Expired
         Expired                     │            │            │
            │                        │            │            │  reativar → novo checkout
      reassinar → novo checkout      │            │            │
                                     │            │      refund/dispute ──▶ Expired
   cancel em trial (hard delete) ────┘
       → volta ao bloqueio (sem sub)
```
\* Sem assinatura viva = **acesso bloqueado (402)**, não "Free". O caminho gateway-trial existe no
código (`ApplyTrialStarted`) mas está **inativo** (planos sem `trialDays`).

---

## 12. Comportamento da UI (`SubscriptionSection`)

- **Banner do plano:** estilo _premium_ (dourado) se o plano concede alguma feature (Pro); _accent_
  (Essencial) caso contrário. Mostra nome curto, chip de status (`STATUS_CONFIG`), preço + sufixo de
  ciclo, e "Cancelar plano" quando `isPaid && isLive`.
  - Sem plano/None: título "Plano Sem plano ativo", subtítulo "Nenhum plano ativo — assine para usar
    o sistema." (resolve o antigo #3; `STATUS_CONFIG.None.label = "SEM PLANO"`).
- **Recursos e limites:** grid de 4 limites (`LIMIT_ORDER`) + módulos inclusos + features avançadas
  (só aparece se houver features). Deriva tudo de `subscription.entitlements`/`limits`.
- **Upsell do Pro (`showUpgrade`):** só para quem tem assinatura viva não-Pro. Toggle mensal/anual,
  destaques de features/limites. CTA:
  - `isLiveCard` → **troca imediata** (`changePlan.mutate`, sem confirmação — #5);
  - senão → abre `PlanCheckoutDialog`.
- **Reassinar/reativar (`showResubscribe`):** para `Canceled`/`Expired`/`None`/`Pending`. Card com
  CTA que abre `PlansDialog`. Se `hasRemainingAccess` (Canceled dentro do período) → avisa da
  cobrança imediata (#6). Se `Pending` (checkout abandonado) → copy própria "Finalize sua
  assinatura" / "Tentar novamente" (RF-02.7 — antes desse ajuste, `Pending` não tinha nenhum CTA).
- **Estado Expirado:** o banner mostra o nome do plano (chip "EXPIRADO"), mas o preço é **omitido**
  e o card "O que seu plano inclui" **não é renderizado** (em vez de aparecer vazio) — ambos
  derivados de `owned.length === 0` / `status === 'Expired'` em `SubscriptionSection/index.tsx`.
  Resolve o antigo #4/RF-07.5.

---

## 13. Bugs e melhorias — status revalidado (2026-07-08)

> Severidade: 🔴 bug/risco · 🟠 inconsistência · 🟡 UX/limpeza · ✅ resolvido · ⚪ observação

### Status dos itens do doc anterior

| # | Item | Status atual | Evidência |
|---|---|---|---|
| #1 | Upgrade durante trial PDV-side falhava | ✅ **Resolvido (backend)** | `SubscriptionService.ChangePlanAsync` trata `Trialing` + sem `GatewaySubscriptionId` trocando só o plano local |
| #2 | PIX no backend, inacessível no frontend | ✅ **Resolvido por remoção** | PIX eliminado do billing (gateway `["CARD"]`, sem `transparent.*`, `GatewayPaymentMethod=Card`, `PixQrDialog` excluído) |
| #3 | Mensagem "Plano Gratuito" para estado sem plano | ✅ **Resolvido** | `STATUS_CONFIG.None="SEM PLANO"`, "Nenhum plano ativo — assine para usar o sistema." |
| #4 | Banner incoerente para assinatura Expirada | ✅ **Resolvido (frontend)** | `SubscriptionSection` omite preço e o card "O que seu plano inclui" quando `owned.length === 0`/`status === 'Expired'` (RF-07.5) |
| #5 | Troca/upgrade sem confirmação nem aviso de cobrança | 🔴 **Aberto** | `handleUpgrade → changePlan.mutate()` dispara direto (sem `ConfirmDialog`) — `index.tsx:195` |
| #6 | Reativação dentro do período sem alerta | ✅ **Resolvido (UX)** | `hasRemainingAccess` → "Reativar agora gera uma nova cobrança imediata" |
| #7 | "Economize ganhado 2 meses grátis." | 🟡 **Aberto** | `SubscriptionSection/index.tsx:560` ainda tem a frase errada |
| #8 | Branch morto de trial no `PlanCheckoutDialog` | 🟡 **Aberto** | `PlanCheckoutDialog/index.tsx:84-88` — `{plan.trialDays ? ...}` nunca executa (planos com `TrialDays=null`) |
| #9 | `EntitlementCatalog.All` desatualizado | ✅ **Resolvido** | `advancedInventory`/`advancedEmployee`/`advancedExpenses` em `Features` e `All` |
| #10 | Grafia "advancedExpanses" | ✅ **Resolvido** | `advancedExpenses` no backend, `entitlements.ts` e consumidores |

### Achados novos / ainda abertos

**#5 (🔴) — Upgrade sem confirmação.** Risco de cobrança acidental (troca imediata gera cobrança no
gateway). O cancelamento tem `ConfirmDialog`; o upgrade não.

**#7 (🟡) — Erro de português.** `"Economize ganhado 2 meses grátis."` → ex.: "Economize 2 meses no
plano anual."

**#8 (🟡) — Branch morto no checkout dialog.** Remover ou reaproveitar (planos não têm `trialDays`).

**#11 (🟡) — Comentário desatualizado em `EntitlementCatalog`.** O cabeçalho diz "9 FEATURES", mas
`Features` tem **13** chaves. Só comentário — corrigir para evitar confusão.

**#13 (🟠) — Falha de renovação sem tratamento.** Sem `PastDue`/dunning/job de `Active` vencido: o
acesso cai por `IsEntitled`, mas `Status` fica `Active` com data no passado (banner incoerente) e
não há retry/aviso de cobrança falha. Ver §7.5 / §9.
- **Sugestão:** tratar evento de falha de cobrança do gateway (se houver) e/ou job que marque `Active`
  vencido como `Expired`; comunicar "pagamento pendente" na UI.

**#15 (🟠) — `backend/CLAUDE.md` desatualizado.** Diz que o gating de módulo emite `MODULE_NOT_IN_PLAN`;
o código emite `NOT_IN_PLAN` (§5). Corrigir a doc do backend.

### ✅ Resolvidos nesta revisão (2026-07-09)

- **#4 / RF-07.5** — Banner de assinatura Expirada não exibe mais preço nem o card "O que seu plano
  inclui" de um plano que não vale mais (`owned.length === 0` / `status === 'Expired'` em
  `SubscriptionSection/index.tsx`).
- **#12 / RF-01.4 / RF-07.4** — `SubscriptionExpiredModal` (novo, global, `DashboardLayout`) aparece
  para o Owner/Admin sempre que `status === 'Expired'`, chamando para ativar um plano. Decisão de
  produto: o checkout continua bloqueado durante o trial vigente (§7.10) — em vez de converter
  antecipadamente, o aviso ativo chega assim que o trial (ou qualquer assinatura) expira.
- **#14 / RF-13.2** — Código morto de PIX removido do frontend: `BillingPaymentsSection`
  (badge "PIX", `PixSubscription` em `KIND_LABELS`, texto "Pagamento via PIX") e a entrada
  `MODULE_NOT_IN_PLAN` (nunca emitida pelo backend) em `utils/apiError.ts`. Tipos `UserPaymentKind`/
  `UserPaymentMethod` (`types/billing.types.ts`) não têm mais variantes de PIX.
- **RF-02.7** — Checkout `Pending` abandonado: `SubscriptionSection` agora expõe CTA de retry
  ("Finalize sua assinatura"/"Tentar novamente") e o `SubscriptionExpiryBackgroundService` expira
  automaticamente `Subscription`/`Payment` `Pending` após `CheckoutDefaults.PendingTtlHours` (24h).

### ✅ Resolvidos desde os docs antigos (mantidos)

- Transição para `Expired` por vencimento (canceladas **e** trials) via `SubscriptionExpiryBackgroundService`.
- Histórico de cobranças exposto (`GET /api/payments/history`).
- `PastDue` removido do enum.
- Idempotência atômica do webhook (estado + `WebhookEvent` num único `SaveChanges`).
- Período anual correto (`NextPeriodEnd` usa `AddYears(1)`).

### ⚪ Observações a validar

- **Idempotência de `checkout.*` por hash do corpo** — depende do gateway reenviar o **mesmo** corpo
  exato; reserialização quebraria a dedup. Validar com o comportamento real do AbacatePay.
- **`ResolveSubscriptionAsync` por `CustomerId`** assume **1 sub viva por cliente**; se a invariante
  quebrar, uma renovação pode cair na assinatura errada.
- **`CancelAsync` chama o gateway antes de persistir** — se a persistência local falhar, o webhook
  `subscription.cancelled` reconcilia (idempotente).
- **`GetLiveByUserIdAsync` filtra por `IsActive`** — nenhum fluxo deve dar soft delete em `Subscription`
  (removeria a sub do filtro → perderia entitlement/histórico).

---

## 14. Lista de requisitos (cobrindo todos os cenários)

> Requisitos funcionais (RF) derivados dos cenários da §7. **Status:** ✅ atendido · 🟠 parcial ·
> ❌ não atendido / lacuna. Serve de checklist para manutenção e regressão.

### RF-01 — Trial PDV-side
- **RF-01.1** ✅ Conceder trial de 30 dias na criação do tenant **somente** com `?plano=<slug>` válido,
  `!HasUsedTrial` e sem assinatura viva; marcar `HasUsedTrial`; não tocar o gateway.
- **RF-01.2** ✅ Trial concede o plano escolhido integralmente (entitled) até `TrialEndsAt`.
- **RF-01.3** ✅ Trial expirado deve virar `Expired` e bloquear o acesso (job horário).
- **RF-01.4** ✅ *(resolvido por decisão de produto — 2026-07-09)* O checkout continua bloqueado
  durante o `Trialing` vigente (decisão consciente, não mudou), mas o `SubscriptionExpiredModal`
  (global) chama para ativar um plano assim que a assinatura vira `Expired` — ver §7.10.
- **RF-01.5** ✅ Slug ausente/desconhecido não deve falhar o onboarding (segue sem trial).
- **RF-01.6** ✅ Trial é único por usuário (`HasUsedTrial` nunca é revertido, inclusive após cancelamento).

### RF-02 — Checkout (cartão)
- **RF-02.1** ✅ Só `Owner`/`Admin` iniciam checkout; plano deve existir local e no gateway.
- **RF-02.2** ✅ Bloquear novo checkout quando já há assinatura `Active`/`Trialing` **entitled** (evita cobrança dupla).
- **RF-02.3** ✅ Permitir checkout quando `Canceled`/`Expired`/`Pending`/`None` (reativação/retry), reaproveitando a mesma `Subscription`.
- **RF-02.4** ✅ Garantir `GatewayCustomer` (`cust_`) e sincronizar Document/Phone no `User`.
- **RF-02.5** ✅ Criar `Payment` `Pending` (`bill_`) no checkout; ativação só por webhook.
- **RF-02.6** ✅ Tela de retorno faz polling de `/me` até `Active`/`Trialing`, com timeout e retry; decide destino (painel/onboarding) por `tenantId`.
- **RF-02.7** ✅ Checkout abandonado/falho deixa a sub `Pending` (bloqueada) — retry é permitido e
  exposto na UI (`showResubscribe` cobre `Pending`); `SubscriptionExpiryBackgroundService` expira a
  `Subscription`/cancela o `Payment` `Pending` órfão após `CheckoutDefaults.PendingTtlHours` (24h).

### RF-03 — Ativação por webhook
- **RF-03.1** ✅ Validar autenticidade: `webhookSecret` (401) + HMAC do corpo raw (403).
- **RF-03.2** ✅ Idempotência por `(Provider, EventId)`; reprocessamento retorna 200 sem efeito.
- **RF-03.3** ✅ Aplicar estado + gravar `WebhookEvent` num único `SaveChanges` (atômico); erro → 500 para retentativa.
- **RF-03.4** ✅ `checkout.completed (PAID)` dá baixa/cria `Payment` `Paid` com período; `subscription.completed` ativa e define `CurrentPeriodEnd`.
- **RF-03.5** ✅ Resolver a assinatura em cascata (metadata → externalId → `subs_` → userId → `cust_`).
- **RF-03.6** ✅ Resolver `Payment` só por `GatewayChargeId` (sem fallback por pendente).
- **RF-03.7** ⚪ Eventos que não resolvem assinatura são no-op mas ainda gravam `WebhookEvent` (idempotência preservada).

### RF-04 — Troca de plano
- **RF-04.1** ✅ Trocar plano exige assinatura viva (`Active`/`Trialing`) e plano-alvo diferente.
- **RF-04.2** ✅ Trial PDV-side: trocar **só o plano local**, preservando datas, sem cobrança.
- **RF-04.3** ✅ Com `GatewaySubscriptionId`: aplicar troca no gateway + local imediatamente; `subscription.plan_changed` reconcilia (sem alterar datas).
- **RF-04.4** ✅ Fora de trial, impedir migração para plano com `TrialDays`.
- **RF-04.5** ❌ **Confirmar antes de trocar** (aviso de cobrança/diferença) — hoje dispara direto (#5).

### RF-05 — Renovação
- **RF-05.1** ✅ Renovação automática por webhook estende `CurrentPeriodEnd` conforme o ciclo (mensal/anual).
- **RF-05.2** ✅ Cobrança de renovação sem `Payment` pré-criado gera um novo `Payment` `Paid` (idempotente por `bill_`).
- **RF-05.3** ✅ Período anual usa `AddYears(1)`; mensal `AddMonths(1)`.
- **RF-05.4** ❌ **Tratar falha de renovação** (dunning/aviso/expiração de `Active` vencido): hoje `Active` vencido só é barrado por `IsEntitled`, com `Status` incoerente e sem retry/aviso (#13).

### RF-06 — Cancelamento
- **RF-06.1** ✅ Só `Owner`/`Admin` cancelam; cancelar no gateway primeiro quando há `subs_`.
- **RF-06.2** ✅ Cancelar em trial: hard delete da sub + `Payment` (FK ordem), desativar lojas do Owner (exclusão em 30d), `AccessRevoked=true` → logout + landing.
- **RF-06.3** ✅ Cancelar pós-trial: `Canceled` + `CanceledAt`, preserva `CurrentPeriodEnd` (acesso até o fim), `AccessRevoked=false`.
- **RF-06.4** ✅ Confirmar cancelamento com mensagem por estado (trial vs. ativa) e link de exportação.
- **RF-06.5** ✅ Webhook `subscription.cancelled` idempotente com o cancel manual (no-op se sub já removida).

### RF-07 — Estado sem acesso (None/Expired)
- **RF-07.1** ✅ Sem assinatura válida → todo módulo/feature/limite gateado retorna 402 (`NOT_IN_PLAN`/`PLAN_LIMIT_EXCEEDED`).
- **RF-07.2** ✅ 402 vira toast amigável de upgrade no frontend (`utils/apiError.ts`).
- **RF-07.3** ✅ `SubscriptionSection` comunica "sem plano/expirado" e oferece reativação (`showResubscribe`).
- **RF-07.4** ✅ *(via modal, não guard de rota — 2026-07-09)* `SubscriptionExpiredModal`, global
  (`DashboardLayout`), aparece para o Owner/Admin em qualquer rota autenticada sempre que
  `status === 'Expired'`, chamando para ativar um plano. Não bloqueia a navegação (o usuário pode
  fechar e segue recebendo toasts 402 soltos), mas cobre a lacuna de "nenhum aviso fora de
  Configurações" — ver §7.9.
- **RF-07.5** ✅ Banner de Expirado não exibe mais preço nem o card de recursos de um plano que não
  vale mais (`SubscriptionSection` deriva de `owned.length === 0`/`status === 'Expired'` — #4).

### RF-08 — Reativação
- **RF-08.1** ✅ Reativar via novo checkout (Canceled/Expired), reaproveitando a `Subscription`.
- **RF-08.2** ✅ Avisar que reativar dentro do período pago gera cobrança imediata (#6).

### RF-09 — Reembolso / chargeback
- **RF-09.1** ✅ `checkout.refunded`/`disputed` → `Payment` `Refunded`/`Disputed` + `Subscription` `Expired` com `CurrentPeriodEnd=now` (acesso cai na hora).

### RF-10 — Multi-tenant / multi-loja
- **RF-10.1** ✅ Uma assinatura do Owner cobre todas as lojas dele; entitlement resolvido via o Owner do tenant atual.
- **RF-10.2** ✅ Limite de lojas (`stores`) barrado na criação de negócio adicional (`EnsureWithinLimitAsync`).
- **RF-10.3** ✅ Funcionário (Employee) enxerga o plano do Owner em `/me` (leitura liberada a qualquer autenticado).
- **RF-10.4** ✅ Cancelar em trial desativa **todas** as lojas ativas do Owner.
- **RF-10.5** ✅ Entidades de billing filtram por `UserId` explicitamente (sem query filter de tenant); `IgnoreQueryFilters` não é usado indevidamente.

### RF-11 — Histórico de cobranças
- **RF-11.1** ✅ `GET /payments/history` paginado, scoped por `UserId`, só `Owner`/`Admin`.
- **RF-11.2** ✅ Exibir método/cartão, tipo, valor, status, data e recibo (quando houver).

### RF-12 — Catálogo / seed
- **RF-12.1** ✅ `PlanSeeder` faz upsert idempotente por `ExternalProductId` no startup (reescreve entitlements/limites).
- **RF-12.2** ✅ Ambos os planos concedem todos os módulos; Pro adiciona todas as features + limites ampliados.
- **RF-12.3** ✅ Chaves de entitlement/limite espelhadas no frontend (`entitlements.ts`) com rótulos PT-BR.

### RF-13 — Consistência de produto (card-only)
- **RF-13.1** ✅ Gateway envia apenas `Methods: ["CARD"]`; sem fluxo/endpoint PIX.
- **RF-13.2** ✅ Código morto de PIX removido: `BillingPaymentsSection` (badge/branch `Pix`,
  `PixSubscription` em `KIND_LABELS`) e a entrada `MODULE_NOT_IN_PLAN` (nunca emitida pelo backend)
  em `apiError.ts` — #14. *(`backend/CLAUDE.md` desatualizado sobre `MODULE_NOT_IN_PLAN` é um item
  à parte, ainda aberto — #15.)*
- **RF-13.3** ✅ `Subscription.Method`/`Payment.Method` sempre `Card`; `PaymentKind` sem `PixSubscription`.
