# Fluxo de assinatura — Cartão (recorrente)

> Escopo: **somente o fluxo de cartão** (assinatura recorrente via AbacatePay). PIX (pagamento único) está fora deste documento.
>
> Gateway: **AbacatePay**. Cartão = `Subscription` recorrente no gateway (`subs_...`), renovação automática.
>
> _Atualizado em 2026-06-23 após revisão do código atual._

---

## 1. Mapa dos componentes

### Backend

| Camada | Arquivo | Papel |
|---|---|---|
| Controller | `PDV.Api/Controllers/SubscriptionsController.cs` | Endpoints REST de gestão (Owner/Admin) |
| Controller | `PDV.Api/Controllers/WebhooksController.cs` | Recebe webhooks do AbacatePay (`/api/webhooks/abacatepay`) |
| Service | `PDV.Infrastructure/Services/SubscriptionService.cs` | Orquestra checkout/cancel/change-plan |
| Service | `PDV.Infrastructure/Services/BillingWebhookService.cs` | Aplica evento de webhook ao estado da assinatura/pagamento |
| Service | `PDV.Infrastructure/Services/EntitlementService.cs` | Resolve o plano efetivo do tenant e faz enforcement 402 |
| Gateway | `PDV.Infrastructure/Services/Payments/AbacatePay/AbacatePayGateway.cs` | Traduz domínio ↔ AbacatePay |
| Webhook | `PDV.Infrastructure/Services/Payments/AbacatePay/AbacatePayWebhookProcessor.cs` | Valida (secret + HMAC) e normaliza o payload para `PaymentWebhookEvent` |
| Repo | `PDV.Infrastructure/Repositories/SubscriptionRepository.cs`, `BillingWebhookRepository.cs`, `PaymentRepository.cs` | Persistência |

### Frontend (`pages/Settings/components/SubscriptionSection`)

| Arquivo | Papel |
|---|---|
| `index.tsx` | Tela principal: banner do plano, recursos, grid de planos, ações |
| `PlanCheckoutDialog/index.tsx` | Modal de checkout (método/cupom). Cartão → redireciona |
| `helpers.ts` | `STATUS_CONFIG`, `getStatusLine`, `formatPrice/Date` |
| `hooks/useSubscription.ts` | React Query: `useSubscription`, `usePlans`, `useStartCheckout`, `useChangePlan`, `useCancelSubscription` |
| `services/subscription.service.ts` | HTTP + mapeamento backend↔frontend |
| `pages/SubscriptionReturn/index.tsx` | Página de retorno pós-checkout (`/assinatura/retorno`), faz polling até ativar |

> Obs.: `PixQrDialog` existe mas é exclusivo do PIX (fora de escopo).
> `useScheduleRenewal` e `useCancelScheduledRenewal` foram removidos — funcionalidade de agendamento de renovação foi cortada.

---

## 2. Modelo de dados

### `Subscription` (`PDV.Domain/Entities/Subscription.cs`)
Uma assinatura **viva por `User` (Owner)**. NÃO é tenant-scoped (sem query filter) — filtrada por `UserId`. Cobre todas as lojas do Owner.

| Campo | Significado no fluxo de cartão |
|---|---|
| `UserId` | Owner dono da assinatura |
| `PlanId` / `Plan` | Plano atual |
| `Status` | `Pending → Trialing/Active → Canceled → Expired` |
| `Method` | `Card` |
| `IsRenewable` | `true` no cartão (renova automaticamente) |
| `Provider` | `"AbacatePay"` |
| `GatewaySubscriptionId` | `subs_...` — capturado nos eventos `subscription.*`. Necessário p/ change-plan e cancel |
| `GatewayCustomerId` | `cust_...` |
| `TrialEndsAt` | Fim do trial (se plano com trial) |
| `CurrentPeriodEnd` | Fim do período pago/trial atual — base do entitlement |
| `CanceledAt` | Quando foi cancelada |

> Campos `PendingPlanId`, `PendingChangeExternalId` e `IsRenewalScheduled` existem na entidade mas não são mais usados pelo fluxo de cartão — a troca de plano é imediata.

### `Payment` (`PDV.Domain/Entities/Payment.cs`)
Histórico de cobranças, scoped por `UserId`.

| Campo | Cartão |
|---|---|
| `GatewayChargeId` | `bill_...` (id do checkout/billing) — chave de idempotência |
| `Kind` | `CardSubscription` |
| `Method` | `Card` |
| `Status` | `Pending → Paid` (ou `Refunded`/`Disputed`) |
| `AmountCents`, `PaidAt`, `ReceiptUrl` | Dados da cobrança |
| `CardLastFour`, `CardBrand` | Capturados do webhook (`data.payerInformation.CARD`) |
| `PeriodStart` / `PeriodEnd` | Preenchidos via `SetPeriod` em `CompleteChargeAsync` (cartão e PIX) |

### Enums
- `SubscriptionStatus`: `Pending, Trialing, Active, PastDue, Canceled, Expired`
- `PaymentStatus`: `Pending, Paid, Refunded, Disputed, Expired, Cancelled`

---

## 3. Resolução do plano efetivo (entitlement)

`EntitlementService.ResolveForCurrentTenantAsync()`:
1. Descobre o **Owner** do tenant atual (`userTenantRepository.GetOwnerUserIdAsync`).
2. Busca a assinatura viva do Owner (`GetLiveByUserIdAsync`).
3. Se `IsEntitled(sub)` → módulos/limites vêm do `Plan` da assinatura.
4. Senão → **plano Free** (`FreePlanDefaults`). A `subscription` ainda pode ser retornada (ex.: expirada) para a UI mostrar status.

`IsEntitled`:
- `Trialing` → `TrialEndsAt` nulo ou no futuro
- `Active` ou `Canceled` → `CurrentPeriodEnd` nulo ou no futuro (cancelado mantém acesso até o fim do período)
- demais → não tem direito

Enforcement: `RequireModuleAsync` (módulo fora do plano → **402** `MODULE_NOT_IN_PLAN`) e `EnsureWithinLimitAsync` (limite atingido → **402** `PLAN_LIMIT_EXCEEDED`).

---

## 4. Endpoints

| Método | Rota | Auth | Service |
|---|---|---|---|
| GET | `/api/subscriptions/me` | Autenticado (qualquer) | `GetMineAsync` |
| GET | `/api/subscriptions/plans` | Autenticado | `GetPlansAsync` |
| POST | `/api/subscriptions/checkout` | Owner,Admin | `StartCheckoutAsync` |
| POST | `/api/subscriptions/change-plan` | Owner,Admin | `ChangePlanAsync` |
| POST | `/api/subscriptions/cancel` | Owner,Admin | `CancelAsync` |
| POST | `/api/webhooks/abacatepay` | Anônimo (validado por secret+HMAC) | `BillingWebhookService.ProcessAsync` |

> Endpoints `schedule-renewal` e `DELETE schedule-renewal` foram removidos.

---

## 5. Cenário: CRIAR CHECKOUT (nova assinatura no cartão)

### Frontend
1. Usuário clica **Assinar** (ou **Reativar**, se cancelada) no card do plano → `handlePlanAction` abre `PlanCheckoutDialog`.
2. No modal escolhe método **Cartão** e cupom (opcional) e confirma.
3. `useStartCheckout` monta `returnUrl = /configuracoes?tab=assinatura` e `completionUrl = /assinatura/retorno` e chama `POST /subscriptions/checkout`.
4. Backend devolve `checkoutUrl` → `window.location.href = checkoutUrl` (redireciona para o AbacatePay).
5. Após pagar, o gateway redireciona para `/assinatura/retorno` (`SubscriptionReturnPage`), que faz **polling de `/me` a cada 3s (timeout 30s)** até `status` virar `Active`/`Trialing`.

### Backend — `StartCheckoutAsync` → `StartCardCheckoutAsync`
Validações em ordem:
- Plano existe localmente e no gateway (`CheckIfPlanExistsAsync`).
- Se plano tem trial e `user.HasUsedTrial` → **`BusinessException`** (já usou trial).
- Se já existe assinatura com `Status Active` ou `Trialing` **e** entitled → **bloqueia** ("Sua assinatura está ativa até {data}").
- Assinatura `Canceled` (mesmo dentro do período pago) **não é bloqueada** — pode reativar imediatamente.
- Plano precisa de `SupportsCard`.

Cria/reaproveita a `Subscription` (uma por usuário):
- `EnsureCustomerAsync` → garante `GatewayCustomer` (`cust_...`) e sincroniza Document/Phone de volta no `User`.
- `sub.Status = Pending`, `Method = Card`, `IsRenewable = true`, `CanceledAt = null`, `PlanId`, `GatewayCustomerId`.
- `metadata = { userId, planId, subscriptionId }`.
- `gateway.CreateSubscriptionCheckoutAsync` → cria assinatura no AbacatePay (`bill_...` + URL). `ExternalId = sub.Id`.
- **Persiste** a `Subscription` (`AddAsync` se nova, `UpdateAsync` se reaproveitada).
- Cria `Payment` `Pending` (`Kind=CardSubscription`, `GatewayChargeId = bill_...`, `AmountCents = plan.PriceCents`, `CouponCode`).

**Dados gravados:** `Subscription` (Pending), `Payment` (Pending), possivelmente `GatewayCustomer` (novo) e `User` (Document/Phone).

**Resposta:** `{ checkoutUrl, pix: null }`.

### Ativação vem por webhook (ver §6), não pela resposta do checkout.

---

## 6. Cenário: ATIVAÇÃO (pós-pagamento) — via webhook

Dois sub-casos, dependendo de o plano ter trial:

### 6a. Plano SEM trial (cobrança imediata)
Chega `checkout.completed` com `status = PAID`:
- `ApplyCheckoutCompletedAsync` → `status == Paid` → `CompleteChargeAsync` marca o `Payment` (`bill_...`) como **`Paid`** (PaidAt, ReceiptUrl, cartão) e preenche `PeriodStart`/`PeriodEnd`.
- Chega `subscription.completed` → `ApplySubscriptionActive`:
  - Captura `GatewaySubscriptionId` (`subs_...`).
  - `Status = Active`, `CurrentPeriodEnd = NextPeriodEnd(now, plan)` — **mensal → +1 mês; anual → +1 ano**.

### 6b. Plano COM trial
Chega `checkout.completed` com `status = PENDING` e `amount = 0`:
- `ApplyCheckoutCompletedAsync` → status != Paid → `ApplyCard` apenas captura `CardLastFour`/`CardBrand` no `Payment` pendente (nenhuma baixa, nenhum dinheiro movido).
- Chega `subscription.trial_started` → `ApplyTrialStarted`:
  - Captura `GatewaySubscriptionId`.
  - `Status = Trialing`, `TrialEndsAt = evt.TrialEndsAt ?? now + Plan.TrialDays`, `CurrentPeriodEnd = TrialEndsAt`.
  - `MarkTrialUsedAsync(UserId)` → `User.HasUsedTrial = true`.

Ao fim do trial, o gateway cobra e envia `checkout.completed (PAID)` + `subscription.renewed` → ver renovação (§8).

**Frontend:** `SubscriptionReturnPage`/`useSubscription` faz polling de `/me` e detecta `Active`/`Trialing`.

---

## 7. Cenário: MUDAR DE PLANO (upgrade/downgrade)

### Frontend
- Só quando a assinatura está **viva no cartão** (`isLive && method === 'Card'`). No grid, o botão do outro plano vira **"Trocar plano"**.
- `handlePlanAction` → `useChangePlan.mutate(planId)` → `POST /change-plan` (sem modal de confirmação).
- Toast: **"Plano alterado."** + invalida `/me`.

### Backend — `ChangePlanAsync` (troca imediata)
- Exige assinatura `Active` ou `Trialing`, `Method == Card` e `GatewaySubscriptionId` presente, senão `BusinessException`.
- **Fora de trial:** não pode trocar para plano com `TrialDays` (`BusinessException`).
- `gateway.ChangeSubscriptionPlanAsync(subs_, novoProduto, qty=1)` — altera o produto no gateway.
- `sub.PlanId = novoPlano.Id` — troca o plano **imediatamente** (sem `PendingPlanId`).
- **Em trial:** se novo plano tem `TrialDays`, recalcula `TrialEndsAt = now + TrialDays` e `CurrentPeriodEnd = TrialEndsAt`.
- Persiste com `UpdateAsync`.

### Webhook `subscription.plan_changed` → `ApplyPlanChangedAsync` (confirmação idempotente)
- Captura `GatewaySubscriptionId` se ainda ausente.
- Reconcilia `PlanId` via `evt.ProductId` → `GetPlanByExternalProductIdAsync` (fallback caso o plano local tenha divergido).
- **NÃO altera datas** — preserva o `CurrentPeriodEnd` do ciclo corrente.
- Se `evt.Status == Paid`: registra a cobrança (`CompleteChargeAsync`).

> Não há mais divergência de "próximo ciclo vs imediato": a troca é aplicada em `ChangePlanAsync` e o webhook apenas confirma/reconcilia.

---

## 8. Cenário: RENOVAR (renovação automática do cartão)

Renovação é **automática** no cartão — não há endpoint. No fim de cada ciclo o AbacatePay cobra e envia eventos.

- Chega `checkout.completed (PAID)` (checkout gerado internamente pelo gateway, **sem `externalId` e sem metadata**):
  - `ResolveSubscriptionAsync` cai no fallback por **`CustomerId` (`cust_...`)** → `GatewayCustomer` → `UserId` → sub.
  - `ResolvePaymentAsync` não encontra `Payment` pré-existente (o `bill_` da renovação é novo) → `CompleteChargeAsync` **cria um novo `Payment` já `Paid`** (idempotente pelo `GatewayChargeId`), com `PeriodStart`/`PeriodEnd` preenchidos.
- Chega `subscription.renewed` → `ApplyRenewed`:
  - Captura `GatewaySubscriptionId`.
  - `Status = Active`, `CurrentPeriodEnd = NextPeriodEnd(now, plan)` — mensal/anual correto.

**Dados gravados:** novo `Payment` (Paid, com período) + `Subscription` (período estendido).

---

## 9. Cenário: CANCELAR

### Frontend
- Botão **"Cancelar plano"** visível quando `isPaid && isLive` (`Active`/`Trialing`).
- `window.confirm` → `useCancelSubscription.mutate()` → `POST /cancel`. Toast "Assinatura cancelada." + invalida `/me`.

### Backend — `CancelAsync`
- Se `Method == Card` e `GatewaySubscriptionId` presente → `gateway.CancelSubscriptionAsync(subs_)` **primeiro** (impede cobrança ao fim do trial/período).
- **Em trial (`Status == Trialing`):** volta imediatamente ao Free com **remoção FÍSICA** (hard delete) da `Subscription` e dos `Payment` da sub — `paymentRepository.DeleteBySubscriptionIdAsync(sub.Id)` (FK: pagamentos antes) + `subscriptionRepository.DeleteAsync(sub)`. Exceção justificada à regra de soft delete (em trial não há cobrança paga). `User.HasUsedTrial` permanece `true` → novo checkout só aceita plano sem trial.
- **Pós-trial (`Active`):** `sub.Status = Canceled`, `sub.CanceledAt = now`. **`CurrentPeriodEnd` é mantido** → o usuário continua com acesso até o fim do período (entitlement `Canceled` + período no futuro = entitled).

### Webhook `subscription.cancelled` → `ApplyCancelled`
- `Status = Canceled`, `CanceledAt ??= now` (idempotente em relação ao cancel manual).
- **Cancelamento em trial:** como a sub já foi removida fisicamente, `ResolveSubscriptionAsync` não a encontra → `ApplyCancelled` é no-op. O `WebhookEvent` ainda é gravado (200), preservando idempotência.

**Comportamento do gateway (doc):** se em trial, mantém até `trialEndsAt` sem cobrar; se ativo, mantém até a data de renovação. Não há nova cobrança.

### Estado pós-cancelamento (dentro do período)
O frontend detecta `isCanceled` (`status === 'Canceled'`):
- Grid de planos exibe botão **"Reativar"** (novo checkout imediato).
- Não há mais fluxo de "Agendar renovação" — foi removido.

---

## 10. Cenário: REATIVAR

Não existe endpoint dedicado de "reativar". A reativação acontece por **novo checkout** reaproveitando a `Subscription` existente:

- **Dentro do período ativo (Canceled, período no futuro):** `StartCheckoutAsync` **permite** — bloqueia apenas `Active`/`Trialing`. O usuário pode contratar novamente mesmo antes do término, gerando nova cobrança imediata. A sub é reaproveitada (reseta `Status = Pending`, `CanceledAt = null`, novo `bill_`/`Payment`).
- **Após o período (Canceled vencido / Expired):** igualmente permitido. Mesmo fluxo.

> Mudança em relação à versão anterior: a reativação **não é mais bloqueada** dentro do período ativo. O usuário pode "pagar duas vezes" se reativar antes do vencimento — considerar alerta de UX.

---

## 11. Pipeline de webhook (entrada)

`WebhooksController.AbacatePay`:
1. Valida `webhookSecret` da query (`VerifySecret`, comparação tempo-constante). Falha → **401**.
2. Lê o corpo **raw** (com `EnableBuffering`).
3. Valida HMAC-SHA256 do corpo com a chave pública fixa do AbacatePay (header `X-Webhook-Signature`). Falha → **403**.
4. `processor.Parse(rawBody)` → `PaymentWebhookEvent` normalizado.
5. **Idempotência:** se `ProcessedEventExistsAsync(provider, eventId)` → retorna **200** sem reprocessar.
6. `billingService.ProcessAsync(evt)` aplica o estado **e** grava o `WebhookEvent` (Processed) **no mesmo `SaveChangesAsync`** — atômico.
7. Erro no processamento → **500** (nada foi persistido → permite retry do gateway).

### Normalização (`AbacatePayWebhookProcessor.MapToEvent`) — pontos do cartão
- **EventId:** `subscription.*` traz `log_...`; `checkout.*` não tem → usa **hash SHA256 do corpo**.
- **ChargeId:** `checkout.id` (`bill_...`).
- **ExternalId:** `checkout.externalId` (= nossa `Subscription.Id`) — **null** em `subscription.completed`/`renewed` (checkout gerado pelo gateway).
- **AmountCents:** cascata `checkout.paidAmount → payment.paidAmount → checkout.amount`. Trial → 0 (correto).
- **Status:** `subscription.cancelled` → usa `subscription.status` (CANCELLED); demais → `checkout.status` (PENDING/PAID).
- **CustomerId:** `customer.id` (canônico).
- **Cartão:** `data.payerInformation.CARD.number/brand`.

### Resolução da `Subscription` no webhook (`ResolveSubscriptionAsync`, em ordem)
1. `metadata.subscriptionId` (presente no 1º checkout).
2. `ExternalId` (= `Subscription.Id`).
3. `SubscriptionId` do gateway (`subs_...`).
4. `metadata.userId`.
5. `CustomerId` (`cust_...`) → usado em renovações sem externalId.

### Resolução do `Payment`
Estritamente por `GatewayChargeId` (`bill_...`). Sem fallback por "pendente mais recente".

---

## 12. Eventos × ações (resumo cartão)

| Evento | Handler | Subscription | Payment |
|---|---|---|---|
| `checkout.completed` (PAID) | `ApplyCheckoutCompletedAsync` | — | marca/cria `Paid` + PeriodStart/End |
| `checkout.completed` (PENDING, trial) | `ApplyCheckoutCompletedAsync` | — | captura cartão no pendente |
| `subscription.completed` | `ApplySubscriptionActive` | `Active`, `NextPeriodEnd`, `subs_` | — |
| `subscription.trial_started` | `ApplyTrialStarted` | `Trialing`, `TrialEndsAt`, `subs_`, marca HasUsedTrial | — |
| `subscription.renewed` | `ApplyRenewed` | `Active`, `NextPeriodEnd` | (cobrança vem no checkout.completed) |
| `subscription.plan_changed` | `ApplyPlanChangedAsync` | reconcilia PlanId, **sem alterar datas** | cria `Paid` se houve cobrança |
| `subscription.cancelled` | `ApplyCancelled` | `Canceled`, `CanceledAt` | — |
| `checkout.refunded` / `checkout.disputed` | `ApplyReversed` | `Expired`, `CurrentPeriodEnd = now` | `Refunded`/`Disputed` |

> `NextPeriodEnd(from, plan)` = `from.AddYears(1)` se `BillingPeriod.Annual`, senão `from.AddMonths(1)`.

---

## 13. Estados (Subscription.Status) — ciclo de vida no cartão

```
                 checkout                   webhook
   (sem sub) ───────────────▶  Pending ──────────────▶  Trialing ──(fim trial, cobrança)──▶ Active
                                  │                          │                                  │
                                  │             cancel (hard delete) ──▶ (sem sub / Free)       │
                                  │                                                             │
                                  │                                                  cancel ────┤
                                  │                                                             ▼
                                  │                                                          Canceled ──(período vence)──▶ Expired (Free)
                                  └──(plano sem trial)──────────────────────▶ Active ◀── renewed
                                                                                 │
                                                                       refund/dispute ──▶ Expired
```
\* Cancelar **em trial** remove a assinatura fisicamente (volta ao Free, `HasUsedTrial` permanece true). Cancelar **pós-trial** (`Active`) mantém `Canceled` com acesso até o período; depois o job `ExpireCanceledPastPeriodAsync` marca `Expired`.

---

## 14. Resposta de `/me` (`GetMineAsync` → `SubscriptionResponse`)

Campos consumidos pelo frontend: `planId/planName`, `status`, `method`, `isRenewable`, `trialEndsAt`, `currentPeriodEnd`, `canceledAt`, `modules`, `limits`, `hasUsedTrial`.

> Campos `pendingPlanId`, `pendingPlanName` e `isRenewalScheduled` foram removidos do contrato.

O `useSyncSubscriptionToStore` espelha um resumo no `auth` slice (Redux) para banner global.
