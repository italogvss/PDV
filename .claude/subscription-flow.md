# Fluxo de assinatura — Cartão (recorrente)

> Escopo: **somente o fluxo de cartão** (assinatura recorrente via AbacatePay). PIX (pagamento único) está fora deste documento.
>
> Gateway: **AbacatePay**. Cartão = `Subscription` recorrente no gateway (`subs_...`), renovação automática.

---

## 1. Mapa dos componentes

### Backend

| Camada | Arquivo | Papel |
|---|---|---|
| Controller | `PDV.Api/Controllers/SubscriptionsController.cs` | Endpoints REST de gestão (Owner/Admin) |
| Controller | `PDV.Api/Controllers/WebhooksController.cs` | Recebe webhooks do AbacatePay (`/api/webhooks/abacatepay`) |
| Service | `PDV.Infrastructure/Services/SubscriptionService.cs` | Orquestra checkout/cancel/change-plan/agendamento |
| Service | `PDV.Infrastructure/Services/BillingWebhookService.cs` | Aplica o evento de webhook ao estado da assinatura/pagamento |
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
| `hooks/useSubscription.ts` | React Query: `useSubscription`, `usePlans`, `useStartCheckout`, `useChangePlan`, `useCancelSubscription`, `useScheduleRenewal`, `useCancelScheduledRenewal` |
| `services/subscription.service.ts` | HTTP + mapeamento backend↔frontend |
| `pages/SubscriptionReturn/index.tsx` | Página de retorno pós-checkout (`/assinatura/retorno`), faz polling até ativar |

> Obs.: `PixQrDialog` existe mas é exclusivo do PIX (fora de escopo).

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
| `PendingPlanId` / `PendingChangeExternalId` (`subu_...`) | Troca de plano agendada para o próximo ciclo |
| `IsRenewalScheduled` | Intenção de renovar ao fim do período (apenas flag, sem ação no gateway) |

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
| `PeriodStart` / `PeriodEnd` | Preenchidos só no PIX hoje (ver problemas) |

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
| POST | `/api/subscriptions/schedule-renewal` | Owner,Admin | `ScheduleRenewalAsync` |
| DELETE | `/api/subscriptions/schedule-renewal` | Owner,Admin | `CancelScheduledRenewalAsync` |
| POST | `/api/webhooks/abacatepay` | Anônimo (validado por secret+HMAC) | `BillingWebhookService.ProcessAsync` |

---

## 5. Cenário: CRIAR CHECKOUT (nova assinatura no cartão)

### Frontend
1. Usuário clica **Assinar** no card do plano → `handlePlanAction` abre `PlanCheckoutDialog`.
2. No modal escolhe método **Cartão** e cupom (opcional) e confirma.
3. `useStartCheckout` monta `returnUrl = /configuracoes?tab=assinatura` e `completionUrl = /assinatura/retorno` e chama `POST /subscriptions/checkout`.
4. Backend devolve `checkoutUrl` → `window.location.href = checkoutUrl` (redireciona para o AbacatePay).
5. Após pagar, o gateway redireciona para `/assinatura/retorno` (`SubscriptionReturnPage`), que faz **polling de `/me` a cada 3s (timeout 30s)** até `status` virar `Active`/`Trialing`.

### Backend — `StartCheckoutAsync` → `StartCardCheckoutAsync`
Validações em ordem:
- Plano existe localmente e no gateway (`CheckIfPlanExistsAsync`).
- Se plano tem trial e `user.HasUsedTrial` → **`BusinessException`** (já usou trial).
- Se já existe assinatura **entitled** (`IsCurrentlyEntitled`) → **bloqueia** (sugere "Agendar renovação").
- Se havia agendamento (`IsRenewalScheduled`), limpa.
- Plano precisa de `SupportsCard`.

Cria/reaproveita a `Subscription` (uma por usuário):
- `EnsureCustomerAsync` → garante `GatewayCustomer` (`cust_...`) e sincroniza Document/Phone de volta no `User`.
- `sub.Status = Pending`, `Method = Card`, `IsRenewable = true`, `CanceledAt = null`, `PlanId`, `GatewayCustomerId`.
- `metadata = { userId, planId, subscriptionId }`.
- `gateway.CreateSubscriptionCheckoutAsync` → cria assinatura no AbacatePay (`bill_...` + URL). `ExternalId = sub.Id`.
- **Persiste** a `Subscription` (`AddAsync` se nova, `UpdateAsync` se reaproveitada).
- Cria `Payment` `Pending` (`Kind=CardSubscription`, `GatewayChargeId = bill_...`, `AmountCents = plan.PriceMonthlyCents`, `CouponCode`).

**Dados gravados:** `Subscription` (Pending), `Payment` (Pending), possivelmente `GatewayCustomer` (novo) e `User` (Document/Phone).

**Resposta:** `{ checkoutUrl, pix: null }`.

### Ativação vem por webhook (ver §10), não pela resposta do checkout.

---

## 6. Cenário: ATIVAÇÃO (pós-pagamento) — via webhook

Dois sub-casos, dependendo de o plano ter trial:

### 6a. Plano SEM trial (cobrança imediata)
Chega `checkout.completed` com `status = PAID`:
- `ApplyCheckoutCompletedAsync` → `status == Paid` → `CompleteChargeAsync` marca o `Payment` (`bill_...`) como **`Paid`** (PaidAt, ReceiptUrl, cartão).
- Chega `subscription.completed` → `ApplySubscriptionActive`:
  - Captura `GatewaySubscriptionId` (`subs_...`).
  - `Status = Active`, `CurrentPeriodEnd = now + 1 mês`.

### 6b. Plano COM trial
Chega `checkout.completed` com `status = PENDING` e `amount = 0`:
- `ApplyCheckoutCompletedAsync` → status != Paid → `ApplyCard` apenas captura `CardLastFour`/`CardBrand` no `Payment` pendente (nenhuma baixa, nenhum dinheiro movido).
- Chega `subscription.trial_started` → `ApplyTrialStarted`:
  - Captura `GatewaySubscriptionId`.
  - `Status = Trialing`, `TrialEndsAt = now + Plan.TrialDays`, `CurrentPeriodEnd = TrialEndsAt`.
  - `MarkTrialUsedAsync(UserId)` → `User.HasUsedTrial = true`.

Ao fim do trial, o gateway cobra e envia `checkout.completed (PAID)` → ver renovação (§8).

**Frontend:** `SubscriptionReturnPage`/`useSubscription` faz polling de `/me` e detecta `Active`/`Trialing`.

---

## 7. Cenário: MUDAR DE PLANO (upgrade/downgrade)

### Frontend
- Só quando a assinatura está **viva no cartão** (`isLive && method === 'Card'`). No grid, o botão do outro plano vira **"Trocar plano"**.
- `handlePlanAction` → `useChangePlan.mutate(planId)` → `POST /change-plan`.
- Toast: **"Mudança de plano agendada para o próximo ciclo."** + invalida `/me`.
- O banner passa a exibir "Mudança para {plano} no próximo ciclo" (via `pendingPlanId`/`pendingPlanName`).

### Backend — `ChangePlanAsync`
- Exige assinatura viva, `Method == Card` e `GatewaySubscriptionId` presente, senão `BusinessException`.
- `gateway.ChangeSubscriptionPlanAsync(subs_, novoProduto, qty=1)` → retorna `subu_...` (`PendingChangeId`, status PENDING).
- Grava `sub.PendingPlanId = novoPlano.Id` e `sub.PendingChangeExternalId = subu_...`. **Não troca o plano ainda.**

### Aplicação — webhook `subscription.plan_changed` → `ApplyPlanChangedAsync`
- Determina novo plano: `PendingPlanId` (nosso) ou, em fallback, `productId` do evento → `GetPlanByExternalProductIdAsync`.
- Aplica `sub.PlanId = novoPlano`, limpa `PendingPlanId`/`PendingChangeExternalId`.
- Se a sub estava em **trial**: reinicia o trial com os `TrialDays` do novo plano (`TrialEndsAt = now + TrialDays`), **sem cobrar**.
- Se **fora de trial**: `Status = Active`, `CurrentPeriodEnd = now + 1 mês` e, se `status == Paid`, registra a cobrança (`CompleteChargeAsync`).

> ⚠️ Há divergência entre a mensagem "próximo ciclo" (frontend/`ChangePlanAsync`) e a aplicação **imediata** quando fora de trial (`ApplyPlanChangedAsync` ativa e estende na hora). Ver `subscription-problems.md`.

---

## 8. Cenário: RENOVAR (renovação automática do cartão)

Renovação é **automática** no cartão — não há endpoint. No fim de cada ciclo o AbacatePay cobra e envia eventos.

- Chega `checkout.completed (PAID)` (checkout gerado internamente pelo gateway, **sem `externalId` e sem metadata**):
  - `ResolveSubscriptionAsync` cai no fallback por **`CustomerId` (`cust_...`)** → `GatewayCustomer` → `UserId` → sub.
  - `ResolvePaymentAsync` não encontra `Payment` pré-existente (o `bill_` da renovação é novo) → `CompleteChargeAsync` **cria um novo `Payment` já `Paid`** (idempotente pelo `GatewayChargeId`).
- Chega `subscription.renewed` → `ApplyRenewed`:
  - Captura `GatewaySubscriptionId`.
  - **Aplica troca de plano agendada** (se `PendingPlanId` setado): `PlanId = PendingPlanId`, limpa pendências.
  - `Status = Active`, `CurrentPeriodEnd = now + 1 mês`.

**Dados gravados:** novo `Payment` (Paid) + `Subscription` (período estendido, plano eventualmente trocado).

---

## 9. Cenário: CANCELAR

### Frontend
- Botão **"Cancelar plano"** visível quando `isPaid && isLive` (`Active`/`Trialing`).
- `window.confirm` → `useCancelSubscription.mutate()` → `POST /cancel`. Toast "Assinatura cancelada." + invalida `/me`.

### Backend — `CancelAsync`
- Se `Method == Card` e `GatewaySubscriptionId` presente → `gateway.CancelSubscriptionAsync(subs_)`.
- `sub.Status = Canceled`, `sub.CanceledAt = now`. **`CurrentPeriodEnd` é mantido** → o usuário continua com acesso até o fim do período (entitlement `Canceled` + período no futuro = entitled).

### Webhook `subscription.cancelled` → `ApplyCancelled`
- `Status = Canceled`, `CanceledAt ??= now` (idempotente em relação ao cancel manual).

**Comportamento do gateway (doc):** se em trial, mantém até `trialEndsAt` sem cobrar; se ativo, mantém até a data de renovação. Não há nova cobrança.

### Estado pós-cancelamento (dentro do período)
O frontend detecta `isInActivePeriod` (`status === 'Canceled'` && `currentPeriodEnd > now`):
- Bloqueia novo checkout dos planos ("Disponível em {data}").
- Oferece **"Agendar renovação"** (§11).

---

## 10. Cenário: REATIVAR

Não existe endpoint dedicado de "reativar". A reativação acontece por **novo checkout** reaproveitando a `Subscription` existente:

- **Dentro do período ativo (Canceled, período no futuro):** novo checkout é **bloqueado** em `StartCheckoutAsync` (`IsCurrentlyEntitled` ainda true). O caminho oferecido é "Agendar renovação".
- **Após o período (Canceled vencido / Expired):** `IsCurrentlyEntitled` é false → `StartCheckoutAsync` permite. Reaproveita a sub (`existingSub`): reseta `Status = Pending`, `CanceledAt = null`, novo `bill_`/`Payment`. Volta ao fluxo de ativação (§6).

---

## 11. Cenário: AGENDAR / CANCELAR AGENDAMENTO DE RENOVAÇÃO

Apenas uma **marcação de intenção** — nenhuma ação no gateway.

### Agendar — `ScheduleRenewalAsync`
- Exige `Status == Canceled` **e** ainda entitled (dentro do período). Senão `BusinessException`.
- `sub.IsRenewalScheduled = true`.
- Frontend: `Alert` no topo "Renovação agendada para {data}. Você poderá escolher o plano ao confirmar." + botão "Cancelar agendamento".

### Cancelar agendamento — `CancelScheduledRenewalAsync`
- `sub.IsRenewalScheduled = false`.

> A flag é **informativa**: nenhum job re-contrata automaticamente. Ao iniciar um novo checkout, `StartCheckoutAsync` limpa a flag. Ver problemas.

---

## 12. Pipeline de webhook (entrada)

`WebhooksController.AbacatePay`:
1. Valida `webhookSecret` da query (`VerifySecret`, comparação tempo-constante). Falha → **401**.
2. Lê o corpo **raw** (com `EnableBuffering`).
3. Valida HMAC-SHA256 do corpo com a chave pública fixa do AbacatePay (header `X-Webhook-Signature`). Falha → **403**.
4. `processor.Parse(rawBody)` → `PaymentWebhookEvent` normalizado.
5. **Idempotência:** se `ProcessedEventExistsAsync(provider, eventId)` → retorna **200** sem reprocessar.
6. `billingService.ProcessAsync(evt)` aplica e salva; depois `RecordEventAsync` grava `WebhookEvent` (Processed).
7. Erro no processamento → **500** (NÃO grava Processed → permite retry do gateway).

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

## 13. Eventos × ações (resumo cartão)

| Evento | Handler | Subscription | Payment |
|---|---|---|---|
| `checkout.completed` (PAID) | `ApplyCheckoutCompletedAsync` | — | marca/cria `Paid` |
| `checkout.completed` (PENDING, trial) | `ApplyCheckoutCompletedAsync` | — | captura cartão no pendente |
| `subscription.completed` | `ApplySubscriptionActive` | `Active`, +1 mês, `subs_` | — |
| `subscription.trial_started` | `ApplyTrialStarted` | `Trialing`, `TrialEndsAt`, `subs_`, marca HasUsedTrial | — |
| `subscription.renewed` | `ApplyRenewed` | `Active`, +1 mês, aplica troca pendente | (cobrança vem no checkout.completed) |
| `subscription.plan_changed` | `ApplyPlanChangedAsync` | troca plano (imediato fora de trial / reinicia trial) | cria `Paid` se houve cobrança |
| `subscription.cancelled` | `ApplyCancelled` | `Canceled`, `CanceledAt` | — |
| `checkout.refunded` / `checkout.disputed` | `ApplyReversed` | `Expired`, `CurrentPeriodEnd = now` | `Refunded`/`Disputed` |

---

## 14. Estados (Subscription.Status) — ciclo de vida no cartão

```
                 checkout                   webhook
   (sem sub) ───────────────▶  Pending ──────────────▶  Trialing ──(fim trial, cobrança)──▶ Active
                                  │                          │                                  │
                                  │                          └──────────── cancel ─────────────┤
                                  │                                                             ▼
                                  │                                                          Canceled ──(período vence)──▶ (Free; status permanece Canceled*)
                                  └──(plano sem trial)──────────────────────▶ Active ◀── renewed
                                                                                 │
                                                                       refund/dispute ──▶ Expired
```
\* não há transição automática para `Expired` por vencimento — ver problemas.

---

## 15. Resposta de `/me` (`GetMineAsync` → `SubscriptionResponse`)

Campos consumidos pelo frontend: `planId/planName`, `status`, `method`, `isRenewable`, `trialEndsAt`, `currentPeriodEnd`, `canceledAt`, `modules`, `limits`, `pendingPlanId/pendingPlanName`, `hasUsedTrial`, `isRenewalScheduled`.

O `useSyncSubscriptionToStore` espelha um resumo no `auth` slice (Redux) para banner global.
