# Módulo de Assinaturas — Documentação de Referência

> Documento de manutenção do módulo de assinaturas/cobrança do Kashing.
> Cobre **cartão** (assinatura recorrente), o **trial PDV-side** (30 dias), a **janela de reembolso**
> (7 dias) e a **retenção de dados** (90 dias).
>
> Gateway: **AbacatePay**. _Revisado em 2026-07-09._

## Invariantes

Quatro regras governam todo o resto. Quando algo aqui parecer arbitrário, é por causa de uma delas.

1. **Um usuário tem no máximo uma assinatura.** Garantido por índice único em `Subscription.UserId`.
   A linha é *reaproveitada* em reativações — nunca se cria uma segunda.
2. **O trial é PDV-side, 30 dias.** O gateway nunca recebe `trialDays`; ele controla apenas a
   recorrência e a política de retentativa. Não existe `Plan.TrialDays` nem
   `subscription.trial_started`.
3. **Sete dias de arrependimento**, contados de `Subscription.StartedAt` (o instante em que a
   assinatura *paga* passou a valer). Dentro da janela, cancelar encerra a assinatura na hora e abre
   uma solicitação de reembolso. Fora dela, cancelar só interrompe as próximas faturas.
4. **Noventa dias de retenção** após a perda de acesso — inclusive para quem nunca assinou. A loja
   continua ativa nesse período para o dono exportar os dados ou reassinar.

E uma quinta, que não é invariante mas engana quem lê o código rápido: **trocar de plano nunca cobra
nada.** O gateway troca o produto na hora, sem calcular diferença; o valor novo entra na próxima
renovação. O que muda entre upgrade e downgrade é apenas *quando os recursos trocam de lado*. Ver §7.4.

---

## 1. Conceito central: dois eixos de billing

O plano define acesso por **dois eixos independentes**, ambos persistidos como JSON no `Plan`:

1. **Entitlements** (`Plan.EntitledModulesJson`) — capabilities **booleanas**. Fonte única:
   `EntitlementCatalog`. Unifica **módulos** (coarse, ex.: `sales`, `inventory`) e **features**
   (fine, ex.: `advancedDashboard` — diferencial do Pro). Ausência da chave = **402** no enforcement.
2. **Limits** (`Plan.LimitsJson`) — limites **numéricos** (`PlanLimits`): `employees`, `stores`,
   `saleHistoryDays`, `auditDays`. Valor `-1` = ilimitado (`PlanLimits.Unlimited`).

São também os dois eixos que classificam uma troca de plano (§7.4): o alvo que retira uma capability
ou encolhe um limite é um downgrade.

> ⚠️ **Não confundir com o eixo de _acesso_ do tenant** (`OperationModule`/permissões de cargo em
> `/auth/me`). O plano é **billing**: nunca esconde/desabilita UI no frontend — o backend barra com
> **402** e o erro vira toast amigável de upgrade.

---

## 2. Mapa dos componentes

### Backend

| Camada | Arquivo | Papel |
|---|---|---|
| Controller | `PDV.Api/Controllers/SubscriptionsController.cs` | `/me`, `/plans`, `checkout`, `change-plan`, `cancel` |
| Controller | `PDV.Api/Controllers/PaymentHistoryController.cs` | `GET /api/payments/history` |
| Controller | `PDV.Api/Controllers/WebhooksController.cs` | `POST /api/webhooks/abacatepay` (anônimo) |
| Controller | `PDV.Api/Controllers/DataExportController.cs` | Exportação CSV — **sem gate de plano**, ver §7.9 |
| Service | `PDV.Infrastructure/Services/SubscriptionService.cs` | Orquestra checkout / change-plan / cancel |
| Service | `PDV.Infrastructure/Services/BillingWebhookService.cs` | Aplica o evento de webhook ao estado |
| Service | `PDV.Infrastructure/Services/EntitlementService.cs` | Resolve o plano efetivo + enforcement 402 |
| Service | `PDV.Infrastructure/Services/PaymentHistoryService.cs` | Mapeia `Payment` → DTO paginado |
| Service | `PDV.Infrastructure/Services/TenantService.cs` | `StartTrialIfEligibleAsync` — concede o trial |
| Service | `PDV.Infrastructure/Services/SubscriptionExpiryBackgroundService.cs` | Varredura horária: expira vencidos + reconcilia retenção |
| Service | `PDV.Infrastructure/Services/TenantDeletionBackgroundService.cs` | Varredura diária: apaga tenants com prazo vencido |
| Service | `PDV.Infrastructure/Services/PlanSeeder.cs` | Upsert idempotente dos planos no startup |
| Helper | `PDV.Application/Helpers/PlanChange.cs` | `IsDowngrade(atual, alvo)` — classifica a troca (§7.4) |
| Helper | `PDV.Application/Helpers/PlanJson.cs` | Lê/serializa `EntitledModulesJson` e `LimitsJson` |
| Gateway | `.../Payments/AbacatePay/AbacatePayGateway.cs` | Traduz domínio ↔ AbacatePay (`Methods:["CARD"]`) |
| Webhook | `.../Payments/AbacatePay/AbacatePayWebhookProcessor.cs` | Valida (secret + HMAC) e normaliza → `PaymentWebhookEvent` |
| Repos | `SubscriptionRepository`, `PaymentRepository`, `BillingWebhookRepository`, `DataRetentionRepository`, `GatewayCustomerRepository`, `PlanRepository` | Persistência (filtro **explícito por `UserId`**) |
| Catálogo | `PDV.Domain/Constants/{EntitlementCatalog, PlanLimits, PlanSeedData, TrialDefaults, CheckoutDefaults, RefundDefaults, RetentionDefaults}.cs` | Definições declarativas |

### Frontend

| Arquivo | Papel |
|---|---|
| `pages/Settings/components/SubscriptionSection/index.tsx` | Banner, recursos/limites, upsell, troca, reativação, cancelar |
| `pages/Settings/components/SubscriptionSection/helpers.ts` | `STATUS_CONFIG`, `RETENTION_DAYS`, `REFUND_WINDOW_DAYS`, `isWithinRefundWindow` |
| `.../SubscriptionSection/PlanCheckoutDialog/index.tsx` | Modal de checkout (cupom) → redireciona ao gateway |
| `.../SubscriptionSection/PlansDialog/index.tsx` | Grade de planos em dois modos: `checkout` (reassinar) e `change` (trocar) |
| `components/PlansGrid/index.tsx` | Cards + comparativo; marca a variante vigente como "Plano atual" |
| `utils/plans.ts` | `isDowngrade` (espelho de `PlanChange`), ciclo, rótulos de limite |
| `pages/SubscriptionReturn/index.tsx` | Retorno pós-checkout — polling de `/me` (3s, timeout 60s) |
| `pages/Settings/components/BillingPaymentsSection/*` | Histórico de faturas (inclui `Failed` + nº da tentativa) |
| `pages/Settings/components/BackupSection/index.tsx` | Exportação CSV + prazo de exclusão |
| `components/SubscriptionExpiredModal/index.tsx` | Modal global de conversão (`DashboardLayout`) |
| `components/PaymentFailedModal/index.tsx` | Modal global de cobrança recusada (1×/sessão) |
| `components/DataDeletionBanner/index.tsx` | Faixa global persistente da exclusão agendada |
| `hooks/useSubscription.ts` | React Query + mensagens de troca e cancelamento |
| `services/subscription.service.ts` | HTTP + mapeamento backend↔frontend |
| `types/subscription.types.ts` | Contrato (`Subscription`, `Plan`, `SubscriptionStatus`, `ChangePlanResult`, `CancelSubscriptionResult`) |

---

## 3. Modelo de dados

### `Subscription`
Uma assinatura por `User` (Owner) — cobre todas as lojas dele. **NÃO é tenant-scoped**; os
repositórios filtram por `UserId` explicitamente.

| Campo | Significado |
|---|---|
| `UserId` | Owner dono da assinatura |
| `PlanId` / `Plan` | Plano **vigente** — o que está sendo pago e cujos entitlements valem |
| **`PendingPlanId`** | **Downgrade** agendado; entra em vigor na virada do ciclo (§7.4). Promovido em `ApplyRenewed`. Upgrades não passam por aqui |
| `Status` | Ver §11 |
| `Method` | `GatewayPaymentMethod` — só `Card` |
| `IsRenewable` | `true` no checkout de cartão; `false` no trial PDV-side |
| `Provider` | `"AbacatePay"` (string **vazia** no trial, que não toca o gateway) |
| `GatewaySubscriptionId` | `subs_...` — necessário p/ change-plan e cancel |
| `GatewayCustomerId` | `cust_...` |
| **`StartedAt`** | Quando a assinatura **paga** passou a valer. Âncora da janela de reembolso. Renovações não a movem; uma reativação sim (`StartCheckoutAsync` zera, `subscription.completed` regrava) |
| `TrialEndsAt` | Fim do trial. Limpo ao virar assinatura paga |
| `CurrentPeriodEnd` | Fim do período vigente — base do entitlement |
| `CanceledAt` | Quando foi cancelada |

Métodos de domínio: `IsEntitledAt(now)` (a regra de direito ao plano vive na entidade, não no
service — o job de retenção precisa dela sem contexto de tenant) e `AccessLostAt(now)`.

### `Payment`
Histórico de cobranças, scoped por `UserId`.

| Campo | Observação |
|---|---|
| `GatewayChargeId` | `bill_...` numa cobrança; `intl_...` numa parcela recusada. **Chave de idempotência** |
| `Kind` | `CardSubscription` \| `OneOffCheckout` |
| `Status` | `Pending → Paid`, ou `Failed`/`Refunded`/`Disputed`/`Cancelled` |
| `RetryNumber` | Tentativa da cobrança recusada — só em `Failed` |
| `PeriodStart` / `PeriodEnd` | Período **que esta cobrança custeia**, derivado do evento (§8) |

### Enums
- `SubscriptionStatus`: `Pending, Trialing, Active, RefundRequested, Canceled, Expired`
  (o `/me` também devolve a string sintética **`"None"`** quando não há assinatura)
- `PaymentStatus`: `Pending, Paid, Failed, Refunded, Disputed, Expired, Cancelled`
- `PaymentWebhookType`: `CheckoutCompleted, CheckoutRefunded, CheckoutDisputed, SubscriptionCompleted,
  SubscriptionRenewed, SubscriptionPaymentFailed, SubscriptionCancelled, Unknown`

---

## 4. Catálogo de planos

`PlanSeeder` faz upsert idempotente por `ExternalProductId` no startup.

| Plano | Preço | Ciclo | Slug | Entitlements | Limites |
|---|---|---|---|---|---|
| Essencial Mensal | R$ 29,99 | Mensal | `essencial-mensal` | Todos os módulos, 0 features | emp 2 · lojas 1 · vendas 90d · auditoria 7d |
| Essencial Anual | R$ 299,99 | Anual | `essencial-anual` | idem | idem |
| Profissional Mensal | R$ 49,99 | Mensal | `profissional-mensal` | Módulos + todas as features | emp ∞ · lojas 5 · vendas ∞ · auditoria ∞ |
| Profissional Anual | R$ 499,99 | Anual | `profissional-anual` | idem | idem |

O diferencial Essencial × Pro são as **features** + os **limites**. O anual embute "2 meses grátis".

Como Essencial e Pro só diferem nesses dois eixos, `PlanChange.IsDowngrade` produz exatamente:

| De → Para | Classificação |
|---|---|
| Essencial → Pro (qualquer ciclo) | imediato |
| Essencial ↔ Essencial (troca de ciclo) | imediato |
| Pro ↔ Pro (troca de ciclo) | imediato |
| Pro → Essencial (qualquer ciclo) | **downgrade → agendado** |

---

## 5. Resolução do plano efetivo (`EntitlementService`)

`ResolveForCurrentTenantAsync()`:
1. Descobre o **Owner** do tenant atual. Sem tenant (onboarding) → usa o próprio `userContext.UserId`.
2. Busca a assinatura do Owner (`GetByUserIdAsync`).
3. Se `IsEntitledAt(now)` → `Entitlements`/`Limits` vêm do `Plan`.
4. Senão → **sem acesso**: `Plan = null`, `Entitlements = []`, `Limits = {}`. Todo `[RequireModule]`/
   `[RequireEntitlement]` retorna **402**. A `Subscription` ainda é devolvida para a UI mostrar o status.

`Subscription.IsEntitledAt(now)`:
- `Trialing` → `TrialEndsAt` nulo ou no futuro
- `Active` ou `Canceled` → `CurrentPeriodEnd` nulo ou no futuro *(cancelar só interrompe as próximas
  faturas; um `Active` com período vencido **deixa de ser entitled sem depender do job**)*
- `Pending`, `RefundRequested`, `Expired` → sem direito

**Enforcement:** `RequireModuleAsync`/`RequireEntitlementAsync` → **402 `NOT_IN_PLAN`**.
`EnsureWithinLimitAsync` → **402 `PLAN_LIMIT_EXCEEDED`**.

---

## 6. Endpoints

| Método | Rota | Auth |
|---|---|---|
| GET | `/api/subscriptions/me` | Autenticado |
| GET | `/api/subscriptions/plans` | Autenticado |
| POST | `/api/subscriptions/checkout` | Owner,Admin |
| POST | `/api/subscriptions/change-plan` | Owner,Admin |
| POST | `/api/subscriptions/cancel` | Owner,Admin |
| GET | `/api/payments/history?page=&pageSize=` | Owner,Admin |
| GET | `/api/reports/{sales,stock,customers,…}/export` | `ViewReports` — **sem gate de plano** |
| POST | `/api/webhooks/abacatepay?webhookSecret=` | Anônimo (secret + HMAC) |

`/me` devolve, além do estado:
- `refundEligibleUntil` (= `StartedAt + 7d`) — escolhe a mensagem de cancelamento;
- `pendingPlanId`/`pendingPlanName`/`pendingPlanStartsAt` — downgrade agendado;
- `lastPaymentFailedAt`/`paymentRetryNumber` — cobrança recusada em retentativa (§7.6).

`change-plan` devolve `{ planName, scheduled, effectiveAt, nextChargeAt }`:

| Caso | `scheduled` | `effectiveAt` | `nextChargeAt` |
|---|---|---|---|
| Upgrade numa assinatura paga | `false` | agora | fim do período vigente |
| Downgrade numa assinatura paga | `true` | fim do período vigente | fim do período vigente |
| Troca no trial | `false` | `null` (já vale) | `null` (não há cobrança) |
| Desistir do downgrade agendado | `false` | `null` | `null` |

`cancel` devolve `{ status, refundRequested, accessUntil, dataAvailableUntil }`.

Nos dois casos o frontend deriva a mensagem da resposta, sem reimplementar a regra.

---

## 7. Cenários

### 7.1 — TRIAL PDV-side (30 dias, sem cartão)

`TenantService.StartTrialIfEligibleAsync`, na criação do tenant:
- Condições: veio `?plano=<slug>` da landing **e** `!user.HasUsedTrial` **e** não há assinatura viva.
- Cria `Subscription` `Trialing`, `Provider = ""`, `IsRenewable = false`,
  `TrialEndsAt = CurrentPeriodEnd = now + 30d`. Marca `user.HasUsedTrial = true` (irreversível).
- **Não chama o gateway** → sem `GatewaySubscriptionId`, sem `Payment`.
- Slug ausente → `resolvePostLoginPath` manda o usuário para `/planos` após o login.
- Fim do trial: o job horário marca `Expired` (§9).

### 7.2 — CHECKOUT (cartão)

`StartCheckoutAsync`:
- Plano existe localmente e no gateway.
- `EnsureCanCheckout` **bloqueia**: `Active`/`Trialing` entitled (evita cobrança dupla) e
  `RefundRequested` (o estorno pendente precisa se resolver antes — senão o `checkout.refunded`
  derrubaria a assinatura nova). `Canceled`/`Expired`/`Pending`/`None` passam.
- `EnsureCustomerAsync` → garante `cust_` e sincroniza Document/Phone no `User`.
- `DiscardGatewaySubscriptionAsync` cancela a recorrência anterior no gateway (best-effort) e zera o
  `GatewaySubscriptionId`. Sem isso, quem reassina depois de uma renovação que falhou fica com **duas
  assinaturas vivas** no gateway — a antiga ainda em dunning —, e o `subs_` novo colide no índice único.
- Reaproveita a `Subscription`: `Status = Pending`, `IsRenewable = true`, `CanceledAt = null`,
  **`PendingPlanId = null`**, **`StartedAt = null`** (janela de reembolso nova), **`TrialEndsAt = null`**,
  **`UpdatedAt = now`** (é daqui que o TTL de `Pending` conta — sem isso o job expiraria a reativação
  no meio do checkout).
- Cria `Payment` `Pending` (`bill_`). **Ativação só por webhook.**
- Resposta: `{ checkoutUrl }`. A tela de retorno faz polling de `/me` até `Active`.

**Checkout abandonado:** o job expira `Subscription` `Pending` mais velha que
`CheckoutDefaults.PendingTtlHours` (24h) e cancela o `Payment` órfão. A UI expõe "Finalize sua
assinatura" / "Tentar novamente".

### 7.3 — ATIVAÇÃO (por webhook)

Os dois eventos chegam **logo após o pagamento** — não há espera pela janela de reembolso.

- `checkout.completed (PAID)` → `CompleteChargeAsync` marca o `Payment` (`bill_`) como `Paid` e grava
  `PeriodStart`/`PeriodEnd` **derivados do evento** (§8).
- `subscription.completed` → `ApplyActivated`: captura `subs_`, `Status = Active`,
  **`StartedAt ??= âncora`**, `CurrentPeriodEnd = PeriodEndFor(evt)`, limpa `TrialEndsAt`/`CanceledAt`.

A ordem de entrega dos dois eventos não importa: nenhum handler lê datas do outro.

### 7.4 — TROCA DE PLANO (upgrade imediato, downgrade agendado)

`POST /subscriptions/change-plan` do AbacatePay **troca o produto da assinatura na hora**. Ele não
calcula proporcional, não emite fatura e **não dispara webhook nenhum** — não existe evento
`subscription.plan_changed`. O único efeito visível é que a **próxima renovação** cobra o valor novo.

Isso deixa uma decisão só nossa: **quando os recursos do plano novo passam a valer no PDV.**
`PlanChange.IsDowngrade(atual, alvo)` responde, olhando os dois eixos do plano (§1) — o alvo é um
downgrade se retira alguma capability ou encolhe algum limite:

| Troca | `PlanId` | `PendingPlanId` | Efeito |
|---|---|---|---|
| **Upgrade** (nada é retirado) | muda **agora** | limpo | usa os recursos novos já; paga o valor novo na renovação |
| **Downgrade** (algo é retirado) | intacto | recebe o alvo | mantém os recursos até o fim do período **já pago**; a troca vale na virada |

> ⚠️ Os dois erros simétricos: aplicar `PlanId` na hora num **downgrade** tira features que o usuário
> já pagou naquele ciclo; agendar um **upgrade** faz ele esperar por algo que não custa nada entregar.

`ChangePlanAsync` exige `Active`/`Trialing`.

- **Trial PDV-side** (sem `subs_`): o gateway não conhece a assinatura e não há nada pago a preservar.
  A troca é sempre imediata, as datas do trial ficam intactas, e a escolha definitiva fica para a hora
  de assinar.
- **Assinatura paga**: chama o gateway e então aplica a tabela acima. Um upgrade também **cancela um
  downgrade que estivesse agendado** — o gateway guarda um produto só por assinatura, e é o que
  acabamos de gravar lá.
- **Desistir do downgrade:** reescolher o plano **vigente** com `PendingPlanId` preenchido volta o
  produto no gateway e limpa o agendamento. Sem isso, quem agenda um downgrade no plano anual ficaria
  preso a ele por até um ano. Reescolher o plano vigente **sem** agendamento continua sendo erro
  ("Você já está neste plano").

Quem promove `PendingPlanId` → `PlanId` é `ApplyRenewed` (§7.5).

### 7.5 — RENOVAÇÃO

Sem endpoint. No fim do ciclo o gateway cobra e envia:
- `checkout.completed (PAID)` — sem `externalId`/metadata; `ResolveSubscriptionAsync` cai no `cust_`.
  Não há `Payment` pré-criado → cria um novo já `Paid` (idempotente por `bill_`).
- `subscription.renewed` → **promove `PendingPlanId` → `PlanId`**, depois `Status = Active` e
  `CurrentPeriodEnd = PeriodEndFor(evt, plano novo)`. A ordem importa: o plano novo pode ter outro
  ciclo (mensal → anual), e calcular o período antes da promoção erraria a data por 11 meses.
  **`StartedAt` fica intacto** — renovar não reabre a janela de reembolso.

> ⚠️ Se a troca mudou o ciclo e o `checkout.completed` chegar **antes** do `subscription.renewed`, o
> `Payment.PeriodEnd` daquela fatura sai calculado pelo ciclo antigo — a menos que o gateway informe
> `checkout.nextChargeAt`, que tem precedência. A `Subscription` fica correta em qualquer ordem.

### 7.6 — FALHA DE RENOVAÇÃO (dunning)

`subscription.payment_failed` chega a cada tentativa recusada, com `installmentId`, `retryNumber` e
`subscription.retryPolicy.maxRetry`.

- **Não muda o `Status` da assinatura**: o acesso já está barrado porque `CurrentPeriodEnd` venceu.
- Registra a falha no histórico: uma linha `Payment` `Failed` por parcela, idempotente pelo
  `installmentId` (retentativas da mesma parcela só avançam o `RetryNumber`).
- Ao esgotar as tentativas, o gateway envia `subscription.cancelled` com
  `cancelledDueTo = "max_payment_retries_exceeded"` → `ApplyCancelled` distingue o involuntário e
  marca `Expired` com `CurrentPeriodEnd = now`. **Não há período de cortesia para quem não pagou.**

**Como o usuário fica sabendo.** `/me` deriva `lastPaymentFailedAt`/`paymentRetryNumber` da **última
cobrança da assinatura**: se ela está `Failed`, o dunning está em curso. Uma retentativa bem-sucedida
grava um `Paid` mais novo e o aviso some sozinho — não há flag a limpar. Com isso:
- `PaymentFailedModal` (global, `DashboardLayout`) aparece **uma vez por sessão** para o Owner/Admin,
  com CTA "Assinar novamente". Tem precedência sobre o `SubscriptionExpiredModal`, que explicaria
  pior o mesmo estado.
- `SubscriptionSection` mostra um alerta permanente de erro com a data e o número da tentativa.

> ⚠️ Não enviamos `retryPolicy` em `subscriptions/create` — vale a do gateway. Se a política importar
> para o produto, é preciso passá-la explicitamente no `CreateSubscriptionBody`.

### 7.7 — CANCELAMENTO

`CancelAsync` exige `Active`/`Trialing`, cancela no gateway primeiro (quando há `subs_`) e então
escolhe um de três desfechos:

| Situação | Estado | Acesso | Dinheiro |
|---|---|---|---|
| Em trial | `Expired`, `TrialEndsAt = CurrentPeriodEnd = now` | cai na hora | não houve cobrança |
| Pago, `now ≤ StartedAt + 7d` | `RefundRequested`, `CurrentPeriodEnd = now` | cai na hora | estorno solicitado |
| Pago, fora da janela | `Canceled`, `CurrentPeriodEnd` **preservado** | até o fim do período | nada a devolver |

Em nenhum caso a loja é desativada e em nenhum caso o usuário é deslogado. Ele continua entrando
para exportar os dados ou reassinar durante os 90 dias de retenção (§9). `HasUsedTrial` permanece
`true` — trial é único por usuário.

**O estorno não tem endpoint na API do AbacatePay.** `RefundRequested` significa "aguardando
aprovação manual no painel". Quando o admin aprova, chega `checkout.refunded` e o ciclo fecha (§7.8).

`subscription.cancelled` (o eco do gateway) é idempotente: preserva `RefundRequested`, distingue o
cancelamento involuntário, e **nunca toca no `Payment`** — o payload traz o `bill_` do checkout
original, que está pago.

### 7.8 — REEMBOLSO / CHARGEBACK

`checkout.refunded`/`checkout.disputed` → `ApplyReversed`: `Payment` vira `Refunded`/`Disputed`.

A assinatura só é derrubada (`Expired`, `CurrentPeriodEnd = now`) quando `RevokesAccess`:
- a assinatura está em `RefundRequested` (o caso normal), **ou**
- a cobrança revertida custeia o período corrente (`PeriodEnd` no futuro), **ou**
- não dá para saber qual cobrança foi revertida (conservador, para chargeback).

Estornar manualmente uma cobrança antiga de quem hoje tem assinatura válida **não** revoga o acesso.

### 7.9 — SEM ACESSO (None/Expired/RefundRequested)

Todo endpoint gateado retorna 402. Não há guard de rota; o `SubscriptionExpiredModal` (global, no
`DashboardLayout`) chama o Owner/Admin para ativar um plano quando `status === 'Expired'`.

**A exportação de dados vive fora do gate de plano** (`DataExportController`, só
`[RequirePermission(ViewReports)]`) — é o que torna possível "cancelar e ainda baixar seus dados".
Antes dessa separação, os exports estavam no `ReportsController` sob
`[RequireEntitlement(AdvancedReports)]`, e nem os assinantes do **Essencial** conseguiam exportar.

---

## 8. Pipeline de webhook

`WebhooksController.AbacatePay`:
1. Valida `webhookSecret` da query (tempo-constante). Falha → **401**.
2. Lê o corpo **raw** (`EnableBuffering`).
3. Valida **HMAC-SHA256** do corpo (header `X-Webhook-Signature`). Falha → **403**.
4. `processor.Parse(rawBody)` → `PaymentWebhookEvent`.
5. **Idempotência:** `(Provider, EventId)` já processado → **200** sem reprocessar.
6. `billingService.ProcessAsync(evt)` aplica o estado **e** grava o `WebhookEvent` no **mesmo
   `SaveChangesAsync`** — atômico.
7. Erro → **500** (nada persistido → o gateway retenta).

Um evento fora da lista de §10 cai em `Unknown` e é um no-op registrado — inclusive um
`subscription.plan_changed` legado, que não existe mais no contrato.

### Datas: sempre do evento, nunca do relógio local

Esta é a regra que evita os bugs mais silenciosos do módulo. Um webhook atrasado ou retentado horas
depois **não pode** estender o ciclo a partir de `DateTime.UtcNow`.

```
AnchorOf(evt)      = subscription.updatedAt ?? paidAt ?? UtcNow   // quando o gateway processou
PeriodEndFor(evt)  = checkout.nextChargeAt ?? AnchorOf(evt) + ciclo do plano
```

O mesmo vale para o `Payment`: `SetPeriod` deriva `PeriodStart`/`PeriodEnd` do evento, **não** de
`sub.CurrentPeriodEnd`. A assinatura só é estendida no `subscription.completed`/`renewed`, que pode
chegar *depois* do `checkout.completed` — ler a data da assinatura ali gravaria o período anterior.

### Normalização (`AbacatePayWebhookProcessor`)
- **EventId:** `subscription.*` traz `log_...`; `checkout.*` não tem → **hash SHA256 (hex) do corpo**.
- **ChargeId:** `checkout.id` (`bill_`).
- **ExternalId:** `checkout.externalId ?? payment.externalId` (= nossa `Subscription.Id`).
- **AmountCents:** `checkout.paidAmount → payment.paidAmount → checkout.amount → subscription.amount`
  (o último degrau cobre `payment_failed`, que não traz nó `checkout`).
- **Status:** `subscription.cancelled` usa `subscription.status`; demais → `checkout.status`.
- **CustomerId:** `customer.id` (canônico; `checkout.customerId` pode divergir).
- Também extraídos: `subscription.updatedAt`, `checkout.nextChargeAt`, `cancelledDueTo`,
  `installmentId`, `retryNumber`, cartão (`payerInformation.CARD`).

### Resolução da `Subscription`
Como cada usuário tem no máximo uma assinatura, basta chegar ao usuário certo — do identificador mais
específico ao mais genérico: `metadata.subscriptionId` → `ExternalId` → `subs_` → `metadata.userId` →
`cust_` (renovações, que não trazem `externalId`).

### Resolução do `Payment`
Estritamente por `GatewayChargeId`. **Sem fallback** por "pendente mais recente" — numa renovação não
há `Payment` pré-criado, e marcar um pendente avulso corromperia o histórico.

Um `checkout.completed (PAID)` que não resolve assinatura é no-op, mas emite `LogWarning`: entrou
dinheiro que não foi registrado.

---

## 9. Jobs

### `SubscriptionExpiryBackgroundService` (a cada 1h)
1. `Canceled` com `CurrentPeriodEnd < now` → `Expired`.
2. `Trialing` com `TrialEndsAt < now` → `Expired`.
3. `Pending` há mais de 24h → `Expired`; `Payment` `Pending` no mesmo corte → `Cancelled`.
4. **`DataRetentionRepository.SyncScheduledDeletionAsync(now, 90)`** — reconcilia a retenção.

### Retenção (`DataRetentionRepository`)
Reconciliação **idempotente**, derivada do estado da assinatura do Owner. Concentrar a regra aqui
evita espalhar `ScheduledDeletionAt` por todo handler que expira uma assinatura.

| Estado do Owner | `Tenant.ScheduledDeletionAt` |
|---|---|
| Assinatura entitled | `null` (agendamento cancelado) |
| Assinatura sem acesso | `AccessLostAt + 90d` |
| **Nenhuma assinatura** | `Tenant.CreatedAt + 90d` |

Lojas **inativas** são puladas: quem encerrou o estabelecimento manualmente já tem prazo próprio
(`TenantService.DeactivateCurrentAsync`, também 90d).

### `TenantDeletionBackgroundService` (a cada 24h)
Apaga permanentemente os tenants com `ScheduledDeletionAt <= now`. **Não filtra por `IsActive`** — a
loja fica ativa durante a retenção, e filtrar por `IsActive` deixaria de excluir justamente esses casos.

### Como o usuário fica sabendo
`Tenant.ScheduledDeletionAt` já vem em `/auth/me` (dentro de `tenants[]`), então o frontend não
precisa de endpoint novo:
- `DataDeletionBanner` (global, `DashboardLayout`) — faixa **não dispensável** com a contagem
  regressiva e dois caminhos de saída: "Baixar meus dados" (`?tab=backup`) e "Assinar um plano".
- `BackupSection` repete o prazo com a data exata, já que é o destino desses botões.

> ⚠️ Job destrutivo e irreversível. O aviso é in-app; **não há e-mail** antes da exclusão.

---

## 10. Eventos × ações

| Evento | Subscription | Payment |
|---|---|---|
| `checkout.completed` (PAID) | — | marca/cria `Paid` + período do evento |
| `checkout.completed` (PENDING) | — | captura cartão no pendente |
| `subscription.completed` | `Active`, `StartedAt ??=`, `CurrentPeriodEnd`, `subs_` | — |
| `subscription.renewed` | promove `PendingPlanId`, `Active`, `CurrentPeriodEnd` (`StartedAt` intacto) | (vem no `checkout.completed`) |
| `subscription.payment_failed` | — | cria/atualiza `Failed` + `RetryNumber` (idempotente por `intl_`) |
| `subscription.cancelled` (voluntário) | `Canceled`, `CanceledAt` (período preservado) | **intocado** |
| `subscription.cancelled` (max retries) | `Expired`, `CurrentPeriodEnd = now` | **intocado** |
| `subscription.cancelled` (em `RefundRequested`) | no-op (espera o `checkout.refunded`) | **intocado** |
| `checkout.refunded` \| `checkout.disputed` | `Expired` **se** `RevokesAccess` (§7.8) | `Refunded`/`Disputed` |

A troca de plano **não aparece nesta tabela**: ela não gera evento algum.

---

## 11. Ciclo de vida

```
Landing ?plano=<slug>
   └──▶ Trialing ──(job: TrialEndsAt)──▶ Expired
           └── cancel ─────────────────▶ Expired        (sem hard delete, sem logout)

checkout ──▶ Pending ──(subscription.completed)──▶ Active   [grava StartedAt]
               │                                     │
               │ (TTL 24h, job)                      ├── cancel ≤ 7d de StartedAt ──▶ RefundRequested
               ▼                                     │        └──(checkout.refunded)──▶ Expired
            Expired                                  ├── cancel > 7d ───────────────▶ Canceled
                                                     │                                   │ (job)
                                                     ├── subscription.renewed ──▶ Active ▼
                                                     └── max_payment_retries ─────▶ Expired

Expired / Canceled(vencida) / None ──▶ reassinar (novo checkout, mesma linha)
                                   └──▶ 90 dias de retenção → exclusão definitiva
```

A troca de plano não muda o `Status` — ela troca `PlanId` (upgrade) ou grava `PendingPlanId`
(downgrade), sem sair de `Active`/`Trialing`.

Sem assinatura viva = **acesso bloqueado (402)**, não "Free".

---

## 12. Comportamento da UI

### Avisos globais (`DashboardLayout`)
Três, em ordem de precedência quando coexistem:
1. **`DataDeletionBanner`** — faixa persistente, não dispensável, quando há exclusão agendada.
2. **`PaymentFailedModal`** — cobrança recusada; uma vez por sessão, Owner/Admin.
3. **`SubscriptionExpiredModal`** — assinatura expirada; suprimido quando (2) está ativo, que explica
   melhor o mesmo estado.

### `SubscriptionSection`
- **Banner:** estilo premium (dourado) se o plano concede features (Pro); accent (Essencial) caso
  contrário. Sem plano → "Nenhum plano ativo — assine para usar o sistema."
- **Expirado:** o banner mostra o nome do plano (chip "EXPIRADO"), mas **omite o preço** e não
  renderiza o card de recursos — o plano guardado não vale mais.
- **`RefundRequested`:** chip "REEMBOLSO EM ANÁLISE" + card explicativo **sem CTA** (o checkout está
  bloqueado até o estorno se resolver).
- **Cobrança recusada:** alerta de erro permanente com data, número da tentativa e CTA de reassinatura.
- **Downgrade agendado:** alerta informativo — "você passa para o {plano} em {data}; até lá seu plano
  atual continua valendo por inteiro" — com botão **"Cancelar troca"** (§7.4).
- **Troca de plano:** dois caminhos, ambos com `ConfirmDialog` obrigatório:
  - o **upsell do Profissional** (só para quem não é Pro), e
  - o botão **"Trocar de plano"** no banner, que abre a `PlansDialog` em modo `change` — único
    caminho para descer de plano ou trocar a periodicidade.

  O diálogo escolhe o texto por `isDowngrade` (espelho de `PlanChange` em `utils/plans.ts`):
  upgrade diz "passa a valer imediatamente, o valor novo entra na renovação de {data}"; downgrade diz
  "você continua no {plano atual} até {data}" e **lista as features que serão perdidas**.
- **Cancelamento:** o `ConfirmDialog` diz exatamente qual dos três desfechos (§7.7) se aplica, usando
  `refundEligibleUntil`, e sempre lembra dos 90 dias + link de exportação.
- **Reassinar (`showResubscribe`):** `Canceled`/`Expired`/`None`/`Pending`. Se `hasRemainingAccess`
  (cancelada dentro do período) → avisa da cobrança imediata.
- **Histórico:** `Failed` aparece como "Recusado (tentativa N)".

---

## 13. Pontos abertos

- **Upgrade a partir de um plano anual sai de graça até a renovação.** A regra "upgrade vale na hora,
  cobra na renovação" (§7.4) é barata num ciclo mensal, mas quem está no Essencial Anual e sobe para o
  Profissional ganha o plano superior por todo o resto do ano. Sem API de proporcional no gateway, as
  saídas seriam agendar o upgrade também, ou cobrar a diferença num checkout avulso.
- **`retryPolicy` não é enviada** em `subscriptions/create` — a política de retentativa é a default do
  gateway, e é ela que determina quando vem o cancelamento por `max_payment_retries_exceeded`.
- **Troca de plano feita fora do app** (direto no painel do gateway) não chega até nós: não há webhook
  para ela. O `PlanId` local ficaria divergindo do produto cobrado.
- **`Payment.PeriodEnd` de uma renovação que muda o ciclo** depende de `checkout.nextChargeAt`; sem
  ele, e se o `checkout.completed` chegar antes do `subscription.renewed`, a fatura registra o período
  pelo ciclo antigo. A `Subscription` fica correta em qualquer ordem.
- **Idempotência de `checkout.*` por hash do corpo** depende de o gateway reenviar bytes idênticos;
  uma reserialização quebraria a dedup.
- **Exclusão de dados sem e-mail.** O aviso é in-app (`DataDeletionBanner`); quem não abrir o sistema
  nos 90 dias perde os dados sem nunca ter sido notificado.
- **Sem e-mail de cobrança recusada** — o aviso também é só in-app.
- **A `Subscription` nunca é soft-deleted.** Nenhum repositório filtra por `IsActive` (era uma
  armadilha: escondia a assinatura de quem cancelou, junto com o histórico). Não reintroduzir.
