# Módulo de Assinaturas — Documentação de Referência

> Documento informativo para manutenção do módulo de assinaturas/cobrança do PDV-Ultra.
> Cobre **cartão** (assinatura recorrente), **PIX** (pagamento único) e o **trial PDV-side**.
>
> Gateway: **AbacatePay**. _Atualizado em 2026-07-02, a partir da revisão do código atual._
>
> ⚠️ Substitui os rascunhos em `.claude/subscription-flow.md` e `.claude/subscription-problems.md`,
> que descrevem um modelo anterior (com "plano Free" e trial no gateway) — **hoje obsoleto**.

---

## 0. TL;DR — o que mudou em relação aos docs antigos

| Antes (`.claude/*`) | Agora |
|---|---|
| Plano **Free** permanente como fallback | **Não existe Free.** Sem assinatura válida → **402** em todo módulo gateado |
| Trial controlado pelo **gateway** (`trialDays` no produto) | **Trial PDV-side** (30 dias), concedido na criação do tenant, **sem tocar o gateway** |
| `Expired` só em refund/dispute (sem job) | `SubscriptionExpiryBackgroundService` (varredura horária) expira canceladas vencidas **e** trials vencidos |
| Histórico de cobranças não exposto | `GET /api/payments/history` consumido pela UI (`BillingPaymentsSection`) |
| `SubscriptionStatus.PastDue` órfão | **Removido** do enum |
| Módulos e features como eixos separados | **Eixo único de billing** (`EntitlementCatalog`): módulos (coarse) + features (fine) num só conjunto de chaves |

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
| Service | `PDV.Infrastructure/Services/SubscriptionExpiryBackgroundService.cs` | Varredura horária → marca vencidos como `Expired` |
| Service | `PDV.Infrastructure/Services/PlanSeeder.cs` | Upsert idempotente dos planos no startup |
| Gateway | `PDV.Infrastructure/Services/Payments/AbacatePay/AbacatePayGateway.cs` | Traduz domínio ↔ AbacatePay |
| Webhook | `PDV.Infrastructure/Services/Payments/AbacatePay/AbacatePayWebhookProcessor.cs` | Valida (secret + HMAC) e normaliza o payload → `PaymentWebhookEvent` |
| Repos | `SubscriptionRepository.cs`, `PaymentRepository.cs`, `BillingWebhookRepository.cs`, `GatewayCustomerRepository`, `PlanRepository` | Persistência (filtro **explícito por `UserId`** — sem query filter de tenant) |
| Catálogo | `PDV.Domain/Constants/{EntitlementCatalog, PlanLimits, PlanSeedData, TrialDefaults}.cs` | Definição declarativa de planos, capabilities e limites |

### Frontend

| Arquivo | Papel |
|---|---|
| `pages/Settings/components/SubscriptionSection/index.tsx` | Tela principal: banner do plano, recursos/limites, upsell do Pro, cancelar |
| `pages/Settings/components/SubscriptionSection/helpers.ts` | `STATUS_CONFIG`, `getStatusLine`, `formatPrice/Date/Limit`, `planCycle` |
| `pages/Settings/components/SubscriptionSection/PlanCheckoutDialog/index.tsx` | Modal de checkout (cupom) → redireciona ao gateway (cartão) |
| `pages/Settings/components/SubscriptionSection/PixQrDialog/index.tsx` | Diálogo do QR PIX — **órfão** (não referenciado, ver §12) |
| `pages/SubscriptionReturn/index.tsx` | Retorno pós-checkout (`/assinatura/retorno`) — polling de `/me` (3s, timeout 30s) |
| `pages/Settings/components/BillingPaymentsSection/*` | Histórico de faturas (`GET /payments/history`) |
| `hooks/useSubscription.ts` | React Query: `useSubscription`, `usePlans`, `useStartCheckout`, `useChangePlan`, `useCancelSubscription`, `useEntitlements`, `useSyncSubscriptionToStore` |
| `services/subscription.service.ts` | HTTP + mapeamento backend↔frontend |
| `types/subscription.types.ts` | Contrato (`Subscription`, `Plan`, `SubscriptionStatus`, `SubscriptionSummary`) |
| `constants/entitlements.ts` | Espelho das chaves de FEATURE + LIMIT + rótulos PT-BR |

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
| `Method` | `Card` \| `Pix` (`GatewayPaymentMethod`; default = `Card`) |
| `IsRenewable` | `true` no cartão; `false` em PIX e trial PDV-side |
| `Provider` | `"AbacatePay"` (string **vazia** no trial PDV-side, que não toca o gateway) |
| `GatewaySubscriptionId` | `subs_...` — só cartão, capturado nos eventos `subscription.*`. **Necessário p/ change-plan e cancel** |
| `GatewayCustomerId` | `cust_...` |
| `TrialEndsAt` | Fim do trial |
| `CurrentPeriodEnd` | Fim do período vigente (pago ou trial) — base do entitlement |
| `CanceledAt` | Quando foi cancelada |

### `Payment` (`PDV.Domain/Entities/Payment.cs`)
Histórico de cobranças, scoped por `UserId`.

| Campo | Observação |
|---|---|
| `GatewayChargeId` | `bill_...` (cartão) / `pix_char_...` (PIX) — **chave de idempotência** |
| `SubscriptionId` / `PlanId` | Vínculo com a assinatura/plano |
| `Kind` | `CardSubscription` \| `PixSubscription` \| `OneOffCheckout` |
| `Method` | `Card` \| `Pix` |
| `Status` | `Pending → Paid` (ou `Refunded`/`Disputed`/`Cancelled`) |
| `AmountCents`, `PaidAt`, `ReceiptUrl`, `CouponCode` | Dados da cobrança |
| `CardLastFour`, `CardBrand` | Cartão usado (do webhook `data.payerInformation.CARD`) |
| `PeriodStart` / `PeriodEnd` | Período coberto — preenchido via `SetPeriod` em `CompleteChargeAsync` |

### Enums (`PDV.Domain/Enums`)
- `SubscriptionStatus`: `Pending, Trialing, Active, Canceled, Expired`
  (o `/me` também devolve a string sintética **`"None"`** quando não há assinatura)
- `PaymentStatus`: `Pending, Paid, Refunded, Disputed, Expired, Cancelled`
- `PaymentKind`: `CardSubscription, PixSubscription, OneOffCheckout`
- `GatewayPaymentMethod`: `Card, Pix`
- `BillingPeriod`: `Monthly, Annual`

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
> O anual embute "2 meses grátis" (12× mensal vs. preço anual).

---

## 5. Resolução do plano efetivo (`EntitlementService`)

`ResolveForCurrentTenantAsync()`:
1. Descobre o **Owner** do tenant atual (`userTenantRepository.GetOwnerUserIdAsync`).
2. Busca a assinatura viva do Owner (`GetLiveByUserIdAsync` — `IsActive`, mais recente).
3. Se `IsEntitled(sub)` → `Entitlements`/`Limits` vêm do `Plan` da assinatura.
4. **Senão → SEM acesso** (não há Free): `Plan = null`, `Entitlements = []`, `Limits = {}`.
   Todo `[RequireModule]`/`RequireEntitlement` retorna **402**. A `Subscription` ainda pode ser
   devolvida (ex.: expirada) para a UI mostrar status.

`IsEntitled(sub)`:
- `Trialing` → `TrialEndsAt` nulo ou no futuro
- `Active` **ou** `Canceled` → `CurrentPeriodEnd` nulo ou no futuro *(cancelado mantém acesso até o fim do período pago)*
- demais (`Pending`, `Expired`) → sem direito

**Enforcement:**
- `RequireModuleAsync(module)` → `RequireEntitlementAsync(EntitlementCatalog.ForModule(module))` → 402 `NOT_IN_PLAN`
- `RequireEntitlementAsync(key)` → 402 `NOT_IN_PLAN` (feature fora do plano)
- `EnsureWithinLimitAsync(limitKey, currentCount)` → 402 `PLAN_LIMIT_EXCEEDED` (limite atingido; `-1` = ilimitado, nunca barra)

> Códigos de erro 402 tratados no frontend (`utils/apiError.ts`): mensagem amigável de upgrade.

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
O `useSyncSubscriptionToStore` espelha um resumo (`SubscriptionSummary`) no `auth` slice (Redux)
para banner global e gating síncrono de features sem endpoint (`useEntitlements`).

---

## 7. Cenários

### 7.1 — TRIAL PDV-side (30 dias, sem cartão)

Concedido em `TenantService.StartTrialIfEligibleAsync` na **criação do tenant**:
- Condições: veio `?plano=<slug>` da landing **e** `!user.HasUsedTrial` **e** não há assinatura viva.
- Cria `Subscription` `Trialing`, `Provider = ""`, `IsRenewable = false`,
  `TrialEndsAt = CurrentPeriodEnd = now + 30d`. Marca `user.HasUsedTrial = true`.
- **Não chama o gateway** → sem `GatewaySubscriptionId`, sem `Payment`.
- Slug ausente/desconhecido → onboarding segue **sem trial** (não falha).
- Fim do trial: `SubscriptionExpiryBackgroundService` marca `Expired` (§9).

> ⚠️ Como o `Method` default é `Card` mas não há `GatewaySubscriptionId`, o caminho de "troca imediata"
> do frontend **não funciona** para este estado — ver bug #1 (§13).

### 7.2 — CRIAR CHECKOUT (cartão)

**Frontend:** `SubscriptionSection` → CTA de upgrade (ou reativação) abre `PlanCheckoutDialog`
(cupom opcional) → `useStartCheckout` monta `returnUrl = /configuracoes?tab=assinatura` e
`completionUrl = /assinatura/retorno`, **hardcoda `method: "Card"`** e chama `POST /checkout`.
Backend devolve `checkoutUrl` → `window.location.href` (redireciona ao AbacatePay). Após pagar, o
gateway redireciona para `/assinatura/retorno` (`SubscriptionReturnPage`), que faz **polling de `/me`
a cada 3s (timeout 30s)** até `Active`/`Trialing`.

**Backend — `StartCheckoutAsync` → `StartCardCheckoutAsync`:**
- Plano existe localmente e no gateway (`CheckIfPlanExistsAsync`).
- Se plano tem `TrialDays` no gateway **e** `user.HasUsedTrial` → `BusinessException` (na prática os
  planos têm `TrialDays = null`, então este ramo não dispara hoje).
- **Bloqueia** apenas se já houver assinatura `Active`/`Trialing` **e** entitled ("ativa até {data}").
  `Canceled` (mesmo dentro do período) **não bloqueia** → reativação imediata.
- `EnsureCustomerAsync` → garante `GatewayCustomer` (`cust_...`) e sincroniza Document/Phone no `User`.
- Reaproveita a `Subscription` do usuário (uma por usuário): `Status = Pending`, `Method = Card`,
  `IsRenewable = true`, `CanceledAt = null`, `GatewayCustomerId`, `PlanId`.
- `metadata = { userId, planId, subscriptionId }`; `gateway.CreateSubscriptionCheckoutAsync`
  (`Methods: ["CARD"]`, `ExternalId = sub.Id`) → `bill_...` + URL.
- Persiste a `Subscription` + cria `Payment` `Pending` (`Kind=CardSubscription`, `GatewayChargeId=bill_`).
- **Resposta:** `{ checkoutUrl, pix: null }`. **Ativação vem por webhook** (§8), não pela resposta.

### 7.3 — CRIAR CHECKOUT (PIX) — só backend

`StartPixCheckoutAsync` existe e funciona no backend (`Method=Pix`, `IsRenewable=false`,
`gateway.CreatePixChargeAsync` → QR embutido, `metadata.period`), devolvendo `{ checkoutUrl: null, pix }`.
**Porém o frontend não expõe PIX** (hardcoda `"Card"`) — ver #2 (§13).

### 7.4 — ATIVAÇÃO (pós-pagamento, via webhook)

**Cartão sem trial (cobrança imediata):**
- `checkout.completed (PAID)` → `ApplyCheckoutCompletedAsync` → `CompleteChargeAsync` marca o
  `Payment` (`bill_`) como `Paid` (PaidAt, ReceiptUrl, cartão, `PeriodStart/End`).
- `subscription.completed` → `ApplySubscriptionActive`: captura `subs_`, `Status = Active`,
  `CurrentPeriodEnd = NextPeriodEnd(now, plan)` (**mensal → +1 mês; anual → +1 ano**).

**PIX (pagamento único):**
- `transparent.completed` → `ApplyPixCompletedAsync`: ativa a sub **e** dá baixa numa só tacada
  (`Status = Active`, `CurrentPeriodEnd = +1 mês/ano` conforme `metadata.period`).

### 7.5 — MUDAR DE PLANO (upgrade/downgrade, cartão — troca imediata)

**Frontend:** só quando `isLiveCard` (`isLive && method === 'Card'`). CTA "Fazer upgrade agora" →
`useChangePlan.mutate(planId)` → `POST /change-plan` (**sem modal de confirmação**). Toast "Plano
alterado." + invalida `/me`.

**Backend — `ChangePlanAsync`:**
- Exige sub `Active`/`Trialing`, `Method == Card` **e `GatewaySubscriptionId` presente** (senão `BusinessException`).
- Fora de trial: não pode trocar para plano com `TrialDays`.
- `gateway.ChangeSubscriptionPlanAsync(subs_, novoProduto, 1)` → `sub.PlanId = novo` **imediatamente**.
- Em trial: se o novo plano tem `TrialDays`, recalcula `TrialEndsAt`/`CurrentPeriodEnd`.

**Webhook `subscription.plan_changed` → `ApplyPlanChangedAsync`** (confirmação idempotente):
captura `subs_`, reconcilia `PlanId` via `evt.ProductId`, **não altera datas**, registra cobrança
(`CompleteChargeAsync`) se `PAID`.

### 7.6 — RENOVAR (automático, cartão)

Sem endpoint. No fim do ciclo o gateway cobra e envia:
- `checkout.completed (PAID)` (gerado internamente pelo gateway, **sem `externalId`/metadata**):
  `ResolveSubscriptionAsync` cai no fallback por **`CustomerId` (`cust_`)**; `ResolvePaymentAsync` não
  acha `Payment` (novo `bill_`) → `CompleteChargeAsync` **cria um `Payment` já `Paid`** (idempotente).
- `subscription.renewed` → `ApplyRenewed`: `Status = Active`, `CurrentPeriodEnd = NextPeriodEnd(now, plan)`.

### 7.7 — CANCELAR

**Frontend:** botão "Cancelar plano" quando `isPaid && isLive`. `ConfirmDialog` (mensagem específica
p/ trial) → `useCancelSubscription.mutate()` → `POST /cancel`. Toast + invalida `/me`.

**Backend — `CancelAsync`:**
- Se `Method == Card` **e** `GatewaySubscriptionId` presente → `gateway.CancelSubscriptionAsync` **primeiro**.
- **Em trial (`Trialing`):** volta ao bloqueio imediato com **remoção FÍSICA** (hard delete) da
  `Subscription` e dos `Payment` da sub (FK: pagamentos antes). Exceção justificada ao soft delete.
  `User.HasUsedTrial` permanece `true` → novo checkout só aceita plano sem trial.
- **Pós-trial (`Active`):** `Status = Canceled`, `CanceledAt = now`, **`CurrentPeriodEnd` preservado**
  → acesso mantido até o fim do período.

**Webhook `subscription.cancelled` → `ApplyCancelled`:** `Status = Canceled`, `CanceledAt ??= now`
(idempotente com o cancel manual). Cancelamento em trial: sub já removida → resolve nada → no-op
(o `WebhookEvent` ainda é gravado, preservando idempotência).

### 7.8 — REATIVAR

Sem endpoint dedicado — reativação por **novo checkout** reaproveitando a `Subscription`:
- `StartCheckoutAsync` bloqueia apenas `Active`/`Trialing` entitled; `Canceled`/`Expired` → permitido.
- ⚠️ Reativar **dentro** do período pago (Canceled, `CurrentPeriodEnd` futuro) é permitido e gera nova
  cobrança imediata — sem aviso de UX (ver #6, §13).

### 7.9 — REEMBOLSO / CHARGEBACK

`checkout.refunded`/`disputed` e `transparent.refunded`/`disputed` → `ApplyReversed`:
`Payment.Status = Refunded/Disputed`, `Subscription.Status = Expired`, `CurrentPeriodEnd = now`
(acesso cai imediatamente).

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
- **EventId:** `subscription.*` traz `log_...`; `checkout.*`/`transparent.*` não têm → **hash SHA256 do corpo**.
- **ChargeId:** `checkout.id` (`bill_`) ou `transparent.id`.
- **ExternalId:** `checkout.externalId ?? payment.externalId ?? transparent.externalId` (= nossa `Subscription.Id`; **null** em `subscription.completed`/`renewed`).
- **AmountCents:** cascata `checkout.paidAmount → payment.paidAmount → checkout.amount → transp`. Trial → 0 (correto).
- **Status:** `subscription.cancelled` usa `subscription.status` (`CANCELLED`); demais → `checkout.status`/`transp.status`.
- **CustomerId:** `customer.id` (canônico; `checkout.customerId` pode divergir — nunca primário).
- **Cartão:** `data.payerInformation.CARD.number/brand`. **ProductId** (para reconciliar plano) e **TrialEndsAt** também extraídos.

### Resolução da `Subscription` (`ResolveSubscriptionAsync`, em ordem)
1. `metadata.subscriptionId` → 2. `ExternalId` (= `Subscription.Id`) → 3. `subs_` do gateway →
4. `metadata.userId` → 5. `CustomerId` (`cust_`, usado em renovações sem externalId).

### Resolução do `Payment`
Estritamente por `GatewayChargeId` (`bill_`/`pix_char_`). **Sem fallback** por "pendente mais recente"
(evita marcar por engano um pendente avulso; numa renovação não há `Payment` pré-criado).

---

## 9. Expiração automática (`SubscriptionExpiryBackgroundService`)

`IHostedService` singleton; varredura **a cada 1h** num scope próprio (repo/DbContext scoped):
- `ExpireCanceledPastPeriodAsync(now)` → `Canceled` com `CurrentPeriodEnd < now` → `Expired`.
- `ExpireTrialingPastEndAsync(now)` → `Trialing` com `TrialEndsAt < now` → `Expired`.

Ambos varrem **todos os usuários** (sem query filter de tenant, por design).

---

## 10. Eventos × ações (resumo)

| Evento (AbacatePay) | Handler | Subscription | Payment |
|---|---|---|---|
| `checkout.completed` (PAID) | `ApplyCheckoutCompletedAsync` | — | marca/cria `Paid` + `PeriodStart/End` |
| `checkout.completed` (PENDING/trial) | `ApplyCheckoutCompletedAsync` | — | captura cartão no pendente |
| `transparent.completed` (PIX) | `ApplyPixCompletedAsync` | `Active`, `+1 mês/ano` | cria/marca `Paid` |
| `subscription.completed` | `ApplySubscriptionActive` | `Active`, `NextPeriodEnd`, `subs_` | — |
| `subscription.trial_started` | `ApplyTrialStarted` | `Trialing`, `TrialEndsAt`, `subs_`, `HasUsedTrial` | — |
| `subscription.renewed` | `ApplyRenewed` | `Active`, `NextPeriodEnd` | (cobrança vem no `checkout.completed`) |
| `subscription.plan_changed` | `ApplyPlanChangedAsync` | reconcilia `PlanId`, **sem alterar datas** | cria `Paid` se cobrado |
| `subscription.cancelled` | `ApplyCancelled` | `Canceled`, `CanceledAt` | `Cancelled` (se resolvido) |
| `checkout/transparent.refunded` \| `.disputed` | `ApplyReversed` | `Expired`, `CurrentPeriodEnd = now` | `Refunded`/`Disputed` |

> `NextPeriodEnd(from, plan)` = `AddYears(1)` se `BillingPeriod.Annual`, senão `AddMonths(1)`.
> ⚠️ Note que `subscription.trial_started`/`trial` do **gateway** só ocorreria se um produto tivesse
> `trialDays` — hoje os planos não têm, então esse fluxo está inativo (o trial é PDV-side).

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
                                     │      (plano c/ trial     │  reativar → novo checkout
                                     │       no gateway = off)  │
   cancel em trial (hard delete) ────┘                          │
       → volta ao bloqueio (sem sub)                 refund/dispute ──▶ Expired
```
\* Trial pode ser **PDV-side** (criado no onboarding, sem gateway) — o caminho gateway-trial existe no
código mas está inativo (planos sem `trialDays`). Sem assinatura viva = **acesso bloqueado (402)**,
não "Free".

---

## 12. Comportamento da UI (`SubscriptionSection`)

- **Banner do plano:** estilo _premium_ (dourado) se o plano concede alguma feature (Pro); _accent_
  (Essencial) caso contrário. Mostra nome curto, chip de status (`STATUS_CONFIG`), preço + sufixo de
  ciclo, e "Cancelar plano" quando `isPaid && isLive`.
- **Recursos e limites:** grid de 4 limites (`LIMIT_ORDER`) + módulos inclusos + features avançadas
  (só aparece se houver features). Deriva tudo de `subscription.entitlements`/`limits`.
- **Upsell do Pro:** só para quem não é Pro (`showUpgrade`). Toggle mensal/anual (escolhe a variante do
  Profissional a contratar), destaques de features novas e limites. CTA:
  - `isLiveCard` → **troca imediata** (`changePlan.mutate`);
  - senão → abre `PlanCheckoutDialog` (checkout no gateway).
- **Estado sem plano (`None`)/expirado:** hoje o banner cai para rótulos de "Gratuito" — ver #3/#4 (§13).
- **`PixQrDialog`:** existe mas **não é referenciado** por nenhum componente ativo (código órfão).

---

## 13. Bugs e melhorias encontrados

> Severidade: 🔴 bug/risco · 🟠 inconsistência · 🟡 UX/limpeza · ✅ já resolvido (vs. docs antigas) · ⚪ observação

### 🔴 Bugs

**#1 — Upgrade durante trial PDV-side falha.**
O trial criado em `TenantService.StartTrialIfEligibleAsync` tem `Method = Card` (default do enum) e
`Status = Trialing`, mas **sem `GatewaySubscriptionId`** (não toca o gateway). No frontend,
`isLiveCard = isLive && method === 'Card'` fica **true**, então o CTA "Fazer upgrade agora" chama
`changePlan.mutate()`. No backend, `ChangePlanAsync` exige `GatewaySubscriptionId` e lança
`BusinessException("Troca de plano disponível apenas para assinaturas no cartão.")`.
→ Um usuário no trial de 30 dias **não consegue** fazer upgrade pelo caminho oferecido.
- Locais: `SubscriptionSection/index.tsx` (`isLiveCard`, `handleUpgrade`), `SubscriptionService.cs:117-118`.
- **Sugestão:** expor no `/me` um flag `canChangePlan` (true só quando há `GatewaySubscriptionId`), ou o
  frontend tratar trial-sem-gateway como caminho de **checkout** (não de troca imediata).

### 🟠 Inconsistências

**#2 — PIX implementado no backend, inacessível no frontend.**
`useStartCheckout` **hardcoda `method: "Card"`** e `PlanCheckoutDialog` não envia `method`/`period`;
`PixQrDialog` é **código órfão**. O backend tem o fluxo PIX completo (`StartPixCheckoutAsync`,
`ApplyPixCompletedAsync`, eventos `transparent.*`).
- **Sugestão:** decidir o produto — expor PIX na UI (seletor de método + `PixQrDialog`) **ou** remover o
  código morto do frontend (`PixQrDialog`) e documentar PIX como "somente API".

**#3 — Mensagem "Plano Gratuito / sem cobranças" para estado sem plano válido.**
Não existe mais Free — sem assinatura (`status None`) ou expirada, o acesso é **bloqueado (402)**. Mas a
tela mostra "Plano Gratuito" e "Plano gratuito — sem cobranças", sugerindo um tier gratuito funcional.
- Locais: `SubscriptionSection/index.tsx` (`planTitle ?? 'Gratuito'`, `statusText`), `helpers.STATUS_CONFIG.None` (label `GRATUITO`).
- **Sugestão:** comunicar "Sem plano ativo — assine para usar" e um CTA de assinatura.

**#4 — Banner incoerente para assinatura Expirada.**
`GetMineAsync` devolve `PlanId` preenchido para uma sub expirada (`sub?.PlanId`), mas `Entitlements`
vazio. Assim `isPaid` fica true → o banner mostra nome/preço do plano + chip "EXPIRADO", porém a seção
"O que seu plano inclui" fica vazia e o subtítulo cai para "Plano gratuito — sem cobranças"
(`getStatusLine('Expired')` retorna `null`).
- **Sugestão:** tratar `Expired` explicitamente (estado "assinatura vencida", CTA de reativação) e/ou
  não popular `PlanId` quando não-entitled.

### 🟡 UX / limpeza

**#5 — Troca/upgrade de plano sem confirmação nem aviso de cobrança.**
`handleUpgrade → changePlan.mutate()` dispara direto (o cancelamento tem `ConfirmDialog`, o upgrade não).
Risco de cobrança acidental. (`index.tsx`, `handleUpgrade`.)

**#6 — Reativação dentro do período pago sem alerta.**
`StartCheckoutAsync` permite novo checkout com sub `Canceled` mesmo com `CurrentPeriodEnd` no futuro →
o usuário pode pagar um novo ciclo antes de usar o período restante, sem aviso. (`SubscriptionService.cs:71-79`.)
- **Sugestão:** alerta no frontend ("Você ainda tem acesso até {data}. Contratar agora mesmo?").

**#7 — Erro de português no upsell.** `"Economize ganhado 2 meses grátis."` (`index.tsx`, bloco de preço
anual). Corrigir (ex.: "Economize 2 meses no plano anual.").

**#8 — Branch morto de trial no `PlanCheckoutDialog`.** Exibe "{trialDays} dias grátis…", mas todos os
planos têm `TrialDays = null` (trial é PDV-side). Nunca executa. (`PlanCheckoutDialog/index.tsx:84-88`.)

**#9 — `EntitlementCatalog.All` desatualizado.** As features `advancedInventory`, `advancedEmployee` e
`advancedExpanses` estão em `EntitlementCatalog.Features` (concedidas ao Pro) mas **faltam em `All`** →
`IsKnown` retorna `false` para elas e não há rótulo PT-BR no backend. Sincronizar `All` com `Features`.
(`EntitlementCatalog.cs`.)

**#10 — Grafia "advancedExpanses".** Deveria ser "advancedExpenses". Consistente entre backend e
frontend (então funciona), mas é grafia incorreta da chave canônica.

### ✅ Resolvidos desde os docs antigos

- **Transição para `Expired` por vencimento** — agora há `SubscriptionExpiryBackgroundService` (horário)
  que expira canceladas vencidas **e** trials vencidos.
- **Histórico de cobranças exposto** — `GET /api/payments/history` consumido por `BillingPaymentsSection`.
- **`PastDue` órfão** — removido do enum.
- **Idempotência atômica do webhook** — estado + `WebhookEvent` num único `SaveChanges`.
- **Período anual correto** — `NextPeriodEnd` usa `AddYears(1)` para anual.

### ⚪ Observações a validar

- **Idempotência de `checkout.*`/`transparent.*` por hash do corpo** — funciona se o gateway reenviar o
  **mesmo** corpo exato; reserialização quebraria a dedup. Validar com o comportamento real do AbacatePay.
- **`ResolveSubscriptionAsync` por `CustomerId`** assume **1 sub viva por cliente**; se a invariante
  quebrar, uma renovação pode cair na assinatura errada.
- **`CancelAsync` chama o gateway antes de persistir** — se a persistência local falhar, o webhook
  `subscription.cancelled` reconcilia (idempotente).
- **`GetLiveByUserIdAsync` filtra por `IsActive`** — nenhum fluxo deve dar soft delete em `Subscription`
  (removeria a sub do filtro e o usuário perderia o entitlement/histórico).
```
