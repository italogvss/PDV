# Módulo de Assinaturas — Referência de Implementação (Stripe)

> **Documento de manutenção.** Explica *como* o módulo de assinaturas/cobrança do Kashing funciona
> sobre o **Stripe** — os fluxos, os cenários, as decisões e as armadilhas. Leia isto antes de mexer
> em qualquer coisa de billing.
>
> - O *o quê* (regras de produto, agnósticas de gateway) está em
>   [subscriptions-requirements.md](subscriptions-requirements.md), com IDs `RF-n`/`CG-n`/cenários
>   (`T`/`C`/`R`/`P`/`X`/`D`) que este documento referencia.
> - Gateway atual: **Stripe** (Billing + Checkout hospedado, SDK `Stripe.net`), migrado do AbacatePay
>   em 2026-07-10 (corte seco — o AbacatePay foi removido por completo).
> - Cobre: **cartão** (assinatura recorrente), **trial PDV-side** (30 dias), **janela de reembolso**
>   (7 dias), **retenção de dados** (90 dias) e **troca de plano com proporcional**.

## Índice

1. [Invariantes](#1-invariantes) · 2. [Modelo conceitual](#2-modelo-conceitual) ·
3. [Mapa de componentes](#3-mapa-de-componentes) · 4. [Modelo de dados](#4-modelo-de-dados) ·
5. [Catálogo e classificação de troca](#5-catálogo-de-planos-e-classificação-de-troca) ·
6. [Plano efetivo e enforcement](#6-resolução-do-plano-efetivo-e-enforcement) ·
7. [Superfície HTTP](#7-superfície-http) · 8. [Fluxos](#8-fluxos-em-detalhe) ·
9. [Pipeline de webhook](#9-pipeline-de-webhook-o-coração) · 10. [Jobs](#10-jobs) ·
11. [Máquina de estados](#11-máquina-de-estados) · 12. [Matriz de cenários](#12-matriz-de-cenários) ·
13. [Setup do Stripe](#13-setup-do-stripe) · 14. [Como testar](#14-como-testar) ·
15. [Armadilhas](#15-armadilhas-de-manutenção)

---

## 1. Invariantes

Cinco regras governam todo o resto. Quando algo aqui parecer arbitrário, é por causa de uma delas.
Nenhuma depende do gateway.

1. **Uma assinatura por usuário.** O titular é o **Owner** (um `User`), não a loja — a assinatura
   cobre todas as lojas dele. Índice único em `Subscription.UserId`. Reativações **reaproveitam a
   mesma linha**; nunca se cria uma segunda. *Consequência:* qualquer identificador do webhook que
   leve ao usuário certo resolve a assinatura.
2. **O trial é PDV-side, 30 dias, sem cartão.** O gateway **nunca** é acionado durante o trial: não
   há cliente, nem assinatura, nem cobrança do lado dele. Não existe `Plan.TrialDays`.
3. **Sete dias de arrependimento**, contados de `Subscription.StartedAt` (o instante em que a
   assinatura *paga* passou a valer). Dentro da janela, cancelar encerra o acesso na hora e **emite o
   estorno**. Fora dela, cancelar só interrompe as próximas faturas. Renovação **não** move
   `StartedAt`; reativação **sim**.
4. **Noventa dias de retenção** após a perda de acesso — inclusive para quem nunca assinou. A loja
   continua ativa e o usuário continua logando, para exportar dados ou reassinar. Vencido o prazo, o
   tenant é apagado definitivamente.
5. **Não existe plano gratuito.** Sem assinatura com direito ao plano, todo endpoint gateado responde
   **402**. "Sem assinatura" é acesso bloqueado, não um tier free.

E uma regra de justiça contratual, da qual sai toda a assimetria da troca de plano:

6. **O usuário nunca perde, no meio de um ciclo já pago, algo pelo qual pagou** — nem uma capability,
   nem tempo de serviço. Por isso o downgrade e o encurtamento de ciclo são *agendados* (§8.6).

---

## 2. Modelo conceitual

### 2.1 Dois eixos de billing

O plano concede acesso por **dois eixos independentes**, ambos persistidos como JSON no `Plan`:

| Eixo | Natureza | Onde | Exemplos |
|---|---|---|---|
| **Entitlements** | Booleanos | `Plan.EntitledModulesJson` | módulos (`sales`, `inventory`) + features (`advancedDashboard`) |
| **Limites** | Numéricos | `Plan.LimitsJson` | `employees`, `stores`, `saleHistoryDays`, `auditDays` (`-1` = ilimitado) |

Fonte única dos entitlements: `EntitlementCatalog`. Lidos via o helper `PlanJson`. A **ausência** de
um entitlement, ou o **estouro** de um limite, produz **402** no backend. O frontend **não esconde
nem desabilita UI** por causa de plano — o 402 vira um toast de upgrade.

> ⚠️ **Não confundir com o eixo de _acesso_ do tenant** (`OperationModule` + permissões de cargo, em
> `/auth/me`). Plano é *billing* (402); permissão de cargo é *acesso* (403). São ortogonais.

### 2.2 Mapa domínio ↔ Stripe

Nenhum tipo do Stripe vaza para fora de `StripeGateway`/`StripeWebhookProcessor`. A tradução:

| Domínio | Stripe | id |
|---|---|---|
| `Plan.ExternalProductId` | **Price** (recorrente) — o produto é só um rótulo; quem cobra é o preço | `price_...` |
| `GatewayCustomer` | Customer | `cus_...` |
| `Subscription` | Subscription | `sub_...` |
| `Subscription.PendingPlanId` (agendamento) | Subscription **Schedule** | `sub_sched_...` |
| `Payment` (cobrança paga) | **PaymentIntent** | `pi_...` |
| `Payment` (fatura recusada) | Invoice | `in_...` |
| Chave de correlação do checkout | `client_reference_id` | = `Subscription.Id` local |

> **API 2025-06-30 (Basil):** o SDK está nessa versão. Dois detalhes que mordem quem conhece a API
> antiga: (a) o **período** vive no *item* da assinatura (`subscription.items.data[].current_period_end`),
> não na assinatura; (b) o link fatura→assinatura mudou para `invoice.parent.subscription_details.
> subscription`, e a cobrança está em `invoice.payments.data[].payment.payment_intent`.

---

## 3. Mapa de componentes

### Backend

| Camada | Arquivo | Papel |
|---|---|---|
| Controller | `PDV.Api/Controllers/SubscriptionsController.cs` | `/me`, `/plans`, `checkout`, `change-plan`, `change-plan/preview`, `cancel` |
| Controller | `PDV.Api/Controllers/PaymentHistoryController.cs` | `GET /api/payments/history` |
| Controller | `PDV.Api/Controllers/WebhooksController.cs` | `POST /api/webhooks/{provider}` (anônimo) |
| Service | `PDV.Infrastructure/Services/SubscriptionService.cs` | Orquestra checkout / change-plan / preview / cancel / refund |
| Service | `PDV.Infrastructure/Services/BillingWebhookService.cs` | **Reconcilia** o evento de webhook ao estado |
| Service | `PDV.Infrastructure/Services/EntitlementService.cs` | Resolve o plano efetivo + enforcement 402 |
| Service | `PDV.Infrastructure/Services/PaymentHistoryService.cs` | `Payment` → DTO paginado |
| Service | `PDV.Infrastructure/Services/TenantService.cs` | `StartTrialIfEligibleAsync` — concede o trial |
| Service | `.../SubscriptionExpiryBackgroundService.cs` | Varredura horária: expira vencidos + reconcilia retenção |
| Service | `.../TenantDeletionBackgroundService.cs` | Varredura diária: apaga tenants com prazo vencido |
| Service | `PDV.Infrastructure/Services/PlanSeeder.cs` | Upsert por Slug; injeta `price_...` da configuração |
| Gateway | `.../Payments/Stripe/StripeGateway.cs` | `IPaymentGateway` — traduz domínio → Stripe |
| Webhook | `.../Payments/Stripe/StripeWebhookProcessor.cs` | `IPaymentWebhookProcessor` — verifica assinatura + normaliza |
| Config | `.../Payments/Stripe/StripeOptions.cs` | `ApiKey`, `WebhookSecret`, `WebhookToleranceSeconds`, `Prices[slug]` |
| Helper | `PDV.Application/Helpers/PlanChange.cs` | `IsScheduled` / `RemovesCapabilities` — classifica a troca |
| Helper | `PDV.Application/Helpers/PlanJson.cs` | Lê/serializa entitlements e limites |
| Contratos | `PDV.Application/{Interfaces/Payments, DTOs/Payments}` | `IPaymentGateway`, `IPaymentWebhookProcessor`, modelos neutros |
| Repos | `Subscription`, `Payment`, `BillingWebhook`, `DataRetention`, `GatewayCustomer`, `Plan` | Persistência (filtro **explícito por `UserId`**) |

**DI (`Program.cs`):** `IStripeClient` é **singleton** (thread-safe, chave fixada na criação);
`StripeGateway`, `StripeWebhookProcessor`, `SubscriptionService`, `BillingWebhookService` são scoped.

### Frontend

| Arquivo | Papel |
|---|---|
| `pages/Settings/components/SubscriptionSection/index.tsx` | Banner, recursos/limites, upsell, troca (com **preview**), reativação, cancelar |
| `.../SubscriptionSection/helpers.ts` | `STATUS_CONFIG`, `getStatusLine`, `isWithinRefundWindow`, reexports de `utils/plans` |
| `.../SubscriptionSection/PlanCheckoutDialog/` | Modal de checkout (cupom) → redireciona ao Stripe |
| `.../SubscriptionSection/PlansDialog/` | Grade de planos: modo `checkout` (reassinar) e `change` (trocar) |
| `components/PlansGrid/` | Cards + comparativo; marca a variante vigente |
| `utils/plans.ts` | `isDowngrade` (lista features perdidas), ciclo, rótulos |
| `pages/SubscriptionReturn/index.tsx` | Retorno pós-checkout — polling de `/me` (3s, timeout 60s) |
| `components/{SubscriptionExpiredModal, PaymentFailedModal, DataDeletionBanner}/` | Avisos globais (`DashboardLayout`) |
| `hooks/useSubscription.ts` | React Query + `useChangePlanPreview` + mensagens de troca/cancelamento |
| `services/subscription.service.ts` | HTTP + mapeamento backend↔frontend |
| `types/subscription.types.ts` | Contrato (`Subscription`, `Plan`, `ChangePlanResult`, `CancelSubscriptionResult`) |

---

## 4. Modelo de dados

Entidades de cobrança (`Plan`, `Subscription`, `GatewayCustomer`, `Payment`, `WebhookEvent`) **não
têm query filter de tenant** — a assinatura pertence ao **Owner (`UserId`)** e o webhook é anônimo.
O isolamento por `UserId` é **explícito nos repositórios**. Nenhum repositório de `Subscription`/
`Payment` filtra por `IsActive`: a assinatura **nunca** é soft-deleted (o cancelamento muda o
`Status`), e filtrar por `IsActive` esconderia a assinatura de quem cancelou junto com seu histórico.

### `Subscription`
Uma assinatura viva por `User`. Métodos de domínio `IsEntitledAt(now)` e `AccessLostAt(now)` moram
**na entidade** (não no service) porque o job de retenção precisa deles sem contexto de tenant.

| Campo | Significado |
|---|---|
| `UserId` | Owner dono da assinatura (índice único) |
| `PlanId` / `Plan` | Plano **vigente** — o que está sendo pago e cujos entitlements valem |
| **`PendingPlanId`** | Troca **agendada** (downgrade ou encurtamento de ciclo). Vale a partir da virada; promovida pelo reconciliador quando o preço vigente muda no gateway. Upgrades não passam por aqui |
| `Status` | Ver §11 |
| `Method` | `GatewayPaymentMethod` — só `Card` |
| `IsRenewable` | `true` no cartão; `false` no trial |
| `Provider` | `"Stripe"` (string **vazia** no trial, que não toca o gateway) |
| `GatewaySubscriptionId` | `sub_...` — necessário p/ upgrade, schedule, cancel |
| `GatewayCustomerId` | `cus_...` |
| **`GatewayScheduleId`** | `sub_sched_...` — o agendamento no gateway enquanto há troca pendente. Uma assinatura governada por schedule não aceita `update` de itens direto: libere o schedule antes de um upgrade |
| **`GatewaySyncedAt`** | `event.created` do **último evento de assinatura aplicado**. Descarta reentregas e eventos fora de ordem (§9). Zerado numa reativação (a assinatura no gateway passa a ser outra) |
| **`StartedAt`** | Quando a assinatura **paga** passou a valer. Âncora da janela de reembolso. `null` enquanto nunca foi paga (trial/pending). `StartCheckoutAsync` zera; o webhook de ativação regrava (`??=`) |
| `TrialEndsAt` | Fim do trial. Limpo ao virar assinatura paga |
| `CurrentPeriodEnd` | Fim do período vigente — base do entitlement |
| `CanceledAt` | Quando foi cancelada |

### `Payment`
Histórico de cobranças do Owner, scoped por `UserId`.

| Campo | Observação |
|---|---|
| **`GatewayChargeId`** | **Chave de idempotência.** `pi_...` (PaymentIntent) numa cobrança paga — é o único id que o evento de estorno também carrega; `in_...` (fatura) numa recusada — estável entre as retentativas da mesma parcela. Uma fatura quitada sem cobrança (cupom 100%) cai no `in_...` e não é estornável |
| `GatewayInvoiceId` | `in_...` — a fatura de origem, para rastreabilidade e recibo |
| `Kind` | `CardSubscription` |
| `Status` | `Pending → Paid`, ou `Failed`/`Refunded`/`Disputed`/`Cancelled` |
| `AmountCents` | Valor em **centavos, inteiro** (CG-8) |
| `RetryNumber` | Tentativa da cobrança recusada (`invoice.attempt_count`) — só em `Failed` |
| `CardLastFour` / `CardBrand` | Do evento `charge.succeeded` |
| `PeriodStart` / `PeriodEnd` | Período **que esta cobrança custeia**, das linhas da fatura (§9) — é o que decide se um estorno derruba o acesso |

### Enums
- `SubscriptionStatus`: `Pending, Trialing, Active, RefundRequested, Canceled, Expired`
  (o `/me` também devolve a string sintética **`"None"`** quando não há assinatura).
- `PaymentStatus`: `Pending, Paid, Failed, Refunded, Disputed, Expired, Cancelled`.
- `PaymentWebhookType`: `CheckoutCompleted, ChargeSucceeded, CheckoutRefunded, CheckoutDisputed,
  SubscriptionCompleted, SubscriptionUpdated, SubscriptionPaymentFailed, SubscriptionCancelled, Unknown`.

---

## 5. Catálogo de planos e classificação de troca

`PlanSeeder` roda no startup (após `Database.Migrate()`), faz upsert idempotente **por `Slug`** e
injeta o `ExternalProductId` (o `price_...`) a partir de `Stripe:Prices:<slug>` na configuração. Um
plano **sem preço configurado é desativado** (`IsActive = false`) — a app sobe mesmo sem chaves do
Stripe (dev), e um `price_` só entra no catálogo quando existe de verdade no gateway. Os ids diferem
entre teste e produção, então **não moram no código**.

| Plano | Preço | Ciclo | Slug | Entitlements | Limites |
|---|---|---|---|---|---|
| Essencial Mensal | R$ 29,99 | Mensal | `essencial-mensal` | Todos os módulos, 0 features | emp 2 · lojas 1 · vendas 90d · auditoria 7d |
| Essencial Anual | R$ 299,99 | Anual | `essencial-anual` | idem | idem |
| Profissional Mensal | R$ 49,99 | Mensal | `profissional-mensal` | Módulos + todas as features | emp ∞ · lojas 5 · vendas ∞ · auditoria ∞ |
| Profissional Anual | R$ 499,99 | Anual | `profissional-anual` | idem | idem |

**Classificação (`PlanChange`, em `PDV.Application/Helpers`).** A pergunta é uma só: *o alvo tira do
usuário algo que ele já pagou por este ciclo?* Três coisas contam como "tirar":

- `IsScheduled(atual, alvo)` = **retira entitlement** OU **encolhe limite** OU **encurta o ciclo**
  (anual→mensal). Se sim → troca **agendada**; se não → **upgrade imediato** (com proporcional).
- `RemovesCapabilities(atual, alvo)` = retira entitlement OU encolhe limite (ignora o ciclo). É só
  para o diálogo **listar as features perdidas**; uma troca agendada só por encurtar o ciclo não tira
  recurso nenhum.

A classificação deriva dos **eixos do próprio plano**, nunca de um "tier" hardcoded — um plano novo
entra no catálogo sem tocar nesta regra. Resultado no catálogo atual:

| De → Para | Classificação | Por quê |
|---|---|---|
| Essencial → Pro (qualquer ciclo) | upgrade imediato | adiciona features/limites |
| Mensal → Anual (mesmo tier) | upgrade imediato | nada retirado, ciclo alonga |
| **Anual → Mensal (mesmo tier)** | **agendado** | encurta o ciclo já pago |
| Pro → Essencial (qualquer ciclo) | **agendado** | retira features + encolhe limites |

Espelho no frontend: `isDowngrade` em `utils/plans.ts` (usado só para listar features perdidas; a
decisão imediato-vs-agendado vem do **preview do backend**, não do frontend).

---

## 6. Resolução do plano efetivo e enforcement

`EntitlementService.ResolveForCurrentTenantAsync()`:
1. Descobre o **Owner** do tenant atual (`userTenantRepository.GetOwnerUserIdAsync`). Sem tenant
   (onboarding) → usa o próprio `userContext.UserId`.
2. Busca a assinatura do Owner (`GetByUserIdAsync`).
3. Se `IsEntitledAt(now)` → `Entitlements`/`Limits` vêm do `Plan`.
4. Senão → **sem acesso**: `Plan = null`, listas vazias. A `Subscription` ainda é devolvida (a UI
   mostra o status), mas todo `[RequireModule]`/`[RequireEntitlement]` retorna **402**.

`Subscription.IsEntitledAt(now)` (a regra de direito ao plano, na entidade):
- `Trialing` → `TrialEndsAt` nulo ou no futuro
- `Active` ou `Canceled` → `CurrentPeriodEnd` nulo ou no futuro *(cancelar só interrompe as próximas
  faturas; um `Active` com período vencido **deixa de ser entitled sem depender do job**)*
- `Pending`, `RefundRequested`, `Expired` → sem direito

**Enforcement** (via atributos no controller, resolvidos pelo `EntitlementService`):
- `RequireModuleAsync` / `RequireEntitlementAsync` → **402 `NOT_IN_PLAN`** (mesmo código p/ módulo e feature).
- O **service** chama `EnsureWithinLimitAsync(limitKey, currentCount)` antes de criar → **402 `PLAN_LIMIT_EXCEEDED`**.
- A **exportação de dados** (`DataExportController`) fica **fora** do gate de plano — é o que permite
  "cancelar e ainda baixar seus dados". É gateada apenas por permissão de cargo (`ViewReports`).

---

## 7. Superfície HTTP

| Método | Rota | Auth |
|---|---|---|
| GET | `/api/subscriptions/me` | Autenticado |
| GET | `/api/subscriptions/plans` | Autenticado |
| POST | `/api/subscriptions/checkout` | Owner,Admin |
| POST | `/api/subscriptions/change-plan/preview` | Owner,Admin |
| POST | `/api/subscriptions/change-plan` | Owner,Admin |
| POST | `/api/subscriptions/cancel` | Owner,Admin |
| GET | `/api/payments/history?page=&pageSize=` | Owner,Admin |
| POST | `/api/webhooks/{provider}` | Anônimo (autenticado por `Stripe-Signature`) |

**`/me` é a fonte única do estado de billing para a UI.** Devolve, além do estado:
`refundEligibleUntil` (= `StartedAt + 7d`), `pendingPlanId/Name/StartsAt` (troca agendada),
`lastPaymentFailedAt`/`paymentRetryNumber` (cobrança recusada). O frontend **deriva mensagens da
resposta**, sem reimplementar regra.

**`change-plan` e `change-plan/preview`** devolvem `{ planName, scheduled, effectiveAt, nextChargeAt,
amountDueNowCents }` — o mesmo shape, para o diálogo simular antes e confirmar depois:

| Caso | `scheduled` | `effectiveAt` | `nextChargeAt` | `amountDueNowCents` |
|---|---|---|---|---|
| Upgrade numa assinatura paga | `false` | agora | fim do período (pós-reancoragem) | diferença proporcional |
| Troca agendada (downgrade / ciclo↓) | `true` | fim do período | fim do período | 0 |
| Troca no trial | `false` | `null` | `null` | 0 |
| Desistir da troca agendada | `false` | `null` | `null` | 0 |

`amountDueNowCents` pode vir **`null`** no *preview* quando o gateway não soube simular — a UI cai
numa mensagem genérica ("será cobrada a diferença proporcional") em vez de mostrar um valor inventado.

**`cancel`** devolve `{ status, refundRequested, accessUntil, dataAvailableUntil }`.

---

## 8. Fluxos em detalhe

### 8.1 — Trial (30 dias, sem cartão) · cenários T1–T7
`TenantService.StartTrialIfEligibleAsync`, chamado na **criação do tenant**:
- Condições: veio `?plano=<slug>` da landing **e** `!user.HasUsedTrial` **e** não há assinatura viva.
- Cria `Subscription` `Trialing`, `Provider = ""`, `IsRenewable = false`,
  `TrialEndsAt = CurrentPeriodEnd = now + 30d`. Marca `user.HasUsedTrial = true` (**irreversível** —
  cancelar, expirar ou assinar não o devolve).
- **Não chama o gateway** → sem `cus_`, sem `sub_`, sem `Payment`.
- Slug ausente → sem trial; após o login, `resolvePostLoginPath` leva o usuário a `/planos` (T3).
- Fim do trial: o job horário marca `Expired` (T4); a retenção de 90d começa.
- Cancelar durante o trial (T5): acesso cai na hora, sem cobrança, sem estorno; loja e login preservados.
- Trocar de plano no trial (T6): imediato, datas do trial intactas, sem cobrança (§8.6).
- Assinar durante o trial (T7): **bloqueado** enquanto o trial está vigente (`EnsureCanCheckout`).

### 8.2 — Checkout / contratação e reativação · cenários C1–C9
`SubscriptionService.StartCheckoutAsync`:
1. Valida as URLs de retorno (vêm do frontend) e que o plano existe local e no gateway
   (`PriceExistsAsync` — ativo **e** recorrente).
2. `EnsureCanCheckout` **bloqueia**: `Active`/`Trialing` **entitled** (evita cobrança dupla, C5) e
   `RefundRequested` (o estorno pendente precisa se resolver antes, senão ele derrubaria a assinatura
   nova — C6/X11). `Canceled`/`Expired`/`Pending`/`None` passam (reativação/retry).
3. `EnsureCustomerAsync` → garante o `cus_` (reusa por e-mail se o registro local se perdeu) e
   **sincroniza Document/Phone de volta no `User`** (RF-18). Envia CPF/CNPJ como `tax_id`.
4. `DiscardGatewaySubscriptionAsync` cancela a recorrência anterior no gateway (**best-effort**) e
   zera `GatewaySubscriptionId`/`GatewayScheduleId`. Sem isto, quem reassina depois de uma renovação
   que falhou fica com **duas assinaturas vivas** no gateway — a antiga ainda em dunning (RF-20/C3).
5. Reaproveita a `Subscription` (RF-1): `Status = Pending`, `StartedAt = null` (janela de reembolso
   nova, X6), `TrialEndsAt = null`, `GatewaySyncedAt = null`, `PendingPlanId = null`,
   `UpdatedAt = now` (é daqui que o TTL de `Pending` conta — sem isto o job expiraria a reativação no
   meio do checkout).
6. Cria a **Checkout Session** (`mode=subscription`, `payment_method_types=["card"]`,
   `client_reference_id = Subscription.Id`, metadata **na sessão e em `subscription_data`**,
   `expires_at ≈ 24h`). Cupom opcional resolvido para `promotion_code` (código inválido → 400).

**Nenhum `Payment` é criado no checkout** — o Stripe só emite a fatura (e o `pi_`/`in_` que a
identificam) quando o pagamento acontece. O histórico nasce do webhook `invoice.paid`. Um checkout
abandonado não deixa lixo `Pending` no histórico; o job só expira a `Subscription` `Pending` após 24h
(C2/C9). **A ativação vem por webhook, nunca desta resposta** (RF-17): o frontend faz polling de `/me`
até `Active` (timeout 60s → "estamos confirmando seu pagamento").

> **Por que a metadata vai em dois lugares?** A metadata da *sessão* não chega aos eventos
> `customer.subscription.*` nem `invoice.*`. A de `subscription_data` o Stripe copia para a
> assinatura e, dela, para **toda fatura futura** — é assim que uma renovação, meses depois, ainda
> resolve o usuário certo sem depender do cliente.

### 8.3 — Ativação (por webhook) · cenários C1, C8
Dois eventos chegam logo após o pagamento, em **qualquer ordem** (CG-14):
- `customer.subscription.created` (e todo `.updated`) → `ReconcileSubscriptionAsync` (§9): captura o
  `sub_`, resolve o plano pelo **preço vigente**, `Status = Active`, `StartedAt ??= event.created`,
  `CurrentPeriodEnd` do item, limpa `TrialEndsAt`/`CanceledAt`.
- `invoice.paid` → registra o `Payment` `Paid` com o período que a fatura custeia.
- `charge.succeeded` → enriquece cartão + recibo.

Nenhum handler lê datas do outro; a ordem não importa.

### 8.4 — Renovação · cenários R1, R2, R7, R8
Sem endpoint. No fim do ciclo o Stripe cobra e envia `invoice.paid` + `customer.subscription.updated`.
O reconciliador estende `CurrentPeriodEnd` a partir do **período do evento** (nunca de `UtcNow`);
`StartedAt` fica intacto (RF-25 — renovar não reabre a janela). Como o plano vem do **preço vigente do
próprio evento**, uma renovação que consuma um downgrade agendado já calcula o período com o ciclo
novo — a promoção acontece *antes* por construção (R2/P9). Evento duplicado (R7) ou atrasado (R8) é
tratado pela idempotência e pelo `GatewaySyncedAt` (§9).

### 8.5 — Falha de renovação / dunning · cenários R3–R6
`invoice.payment_failed` chega a cada tentativa recusada, com `invoice.attempt_count`.
- **Não muda o `Status` da assinatura** (RF-27): o acesso já caiu sozinho porque `CurrentPeriodEnd`
  venceu. O que a falha faz é registrar uma linha `Payment` `Failed`, idempotente pelo `in_...` —
  retentativas da **mesma** fatura só avançam `RetryNumber`, sem criar linha nova (R4).
- Uma retentativa **bem-sucedida** grava um `Payment` `Paid` mais novo (via `invoice.paid`); o aviso
  em `/me` some sozinho, porque ele é derivado da **última** cobrança (R5).
- Esgotadas as tentativas, o Stripe envia `customer.subscription.deleted` com
  `cancellation_details.reason = payment_failed` → **`Expired`, período agora, sem cortesia** (R6/RF-28).

**Como o usuário fica sabendo:** `/me` deriva `lastPaymentFailedAt`/`paymentRetryNumber` da última
cobrança da assinatura. Se ela está `Failed`, o dunning está em curso. Superfícies: `PaymentFailedModal`
(global, 1×/sessão, precedência sobre o `SubscriptionExpiredModal`), alerta permanente na tela de
assinatura, e "Recusado (tentativa N)" no histórico.

### 8.6 — Troca de plano · cenários P1–P12
`SubscriptionService.ChangePlanAsync` (e `PreviewChangePlanAsync`, que valida as mesmas regras e não
executa nada) resolvem a troca em `ResolveChangeAsync` → um de quatro caminhos (`ChangeKind`):

| `ChangeKind` | Quando | O que faz |
|---|---|---|
| **Upgrade** | assinatura paga, nada retirado, ciclo não encurta | libera o schedule pendente → `UpgradeSubscriptionAsync` (`proration_behavior = always_invoice`) → **cobra a diferença agora**. `PlanId` muda, `PendingPlanId` limpo, `CurrentPeriodEnd` reancorado pela resposta |
| **Scheduled** | assinatura paga, retira recurso **ou** encurta ciclo | `ScheduleDowngradeAsync` cria um **subscription schedule** de 2 fases (atual intacta até o fim do período; seguinte no preço novo, `proration_behavior = none`). Grava `PendingPlanId` + `GatewayScheduleId`. **Nada cobrado nem creditado** |
| **Trial** | assinatura em trial (sem `sub_`) | `PlanId` muda na hora; datas do trial intactas; sem gateway, sem cobrança (P12) |
| **Withdrawal** | reescolher o plano vigente **com** agendamento | libera o schedule → limpa `PendingPlanId` (P6). Reescolher o vigente **sem** agendamento → 400 "Você já está neste plano" (P7). Reescolher o mesmo já agendado → 400 (P8) |

Regras que caem fora de graça dessa estrutura:
- **Um upgrade cancela um downgrade agendado** (P5/RF-34): `UpgradeAsync` chama `ReleaseScheduleAsync`
  antes (o Stripe não altera itens de uma assinatura governada por schedule).
- **A promoção `PendingPlanId → PlanId` nunca é otimista aqui.** Ela acontece no reconciliador (§9),
  quando o preço vigente no gateway vira o do plano agendado (P9). Isso mantém o local coerente com o
  que o gateway realmente cobra, e cobre trocas feitas fora do app.
- **Plano agendado que some do catálogo** (P11): o reconciliador mantém o plano atual + loga aviso; o
  `PendingPlanId` é limpo quando o schedule se libera (`ApplySchedule`).

**UI (RF-37):** toda troca passa por `ConfirmDialog`. O diálogo chama `change-plan/preview` para
mostrar o valor exato do proporcional ("Será cobrado R$ 12,47 agora") e a data de vigência; num
downgrade, **lista as features que serão perdidas** e a data. O botão de confirmar só habilita depois
que o preview chega.

### 8.7 — Cancelamento · cenários X1, X3, X4, X5
`SubscriptionService.CancelAsync` exige `Active`/`Trialing`, **cancela no gateway primeiro** (RF-38 —
mesmo que a persistência local falhe, a próxima fatura não é cobrada), limpa `GatewayScheduleId`/
`PendingPlanId`, e então escolhe um de três desfechos:

| Situação | Estado final | Acesso | Dinheiro |
|---|---|---|---|
| Em trial | `Expired` (`TrialEndsAt = CurrentPeriodEnd = now`) | cai na hora | não houve cobrança |
| Pago, `now ≤ StartedAt + 7d` | `RefundRequested` (`CurrentPeriodEnd = now`) | cai na hora | **estorno emitido** |
| Pago, fora da janela | `Canceled` (`CurrentPeriodEnd` **preservado**) | até o fim do período | nada a devolver |

**Cancelar nunca desativa a loja e nunca desloga o usuário** (RF-40): ele continua entrando para
exportar dados ou reassinar durante os 90 dias. `HasUsedTrial` permanece `true`.

A janela conta de `StartedAt`: renovar e cancelar 2 dias depois está **fora** (X5, a janela não moveu);
reativar e cancelar 2 dias depois está **dentro** (X6, a reativação gravou `StartedAt` novo).

### 8.8 — Estorno e reembolso · cenários X1, X2, X7, X8
Dentro da janela, `RequestRefundAsync` marca `RefundRequested` e chama `IssueRefundsAsync`, que
**estorna toda cobrança paga desde `StartedAt`** (`GetPaidBySubscriptionSinceAsync`, `AmountCents > 0`)
via `gateway.RefundAsync(pi_)`. Dentro de 7 dias pode haver a fatura inicial **mais** a proporcional
de um upgrade — as duas são estornadas. O estorno é **assíncrono e idempotente** (chave de idempotência
`refund:<pi>`): a assinatura fica em `RefundRequested` (checkout bloqueado, RF-19) até o webhook
confirmar. Se `refunds.create` falhar, a assinatura **segue em `RefundRequested`** e o log é o alarme
para resolver no painel — o cancelamento não é desfeito.

`charge.refunded`/`charge.dispute.created` → `Payment` vira `Refunded`/`Disputed`. A assinatura só é
derrubada (`Expired`, período = `event.created`) quando **`RevokesAccess`** (RF-42):
- a assinatura está em `RefundRequested` (o caso normal, X2), **ou**
- a cobrança **revertida por inteiro** (`charge.refunded` total, ou uma disputa) custeia o período
  corrente (`PeriodEnd` no futuro, X7), **ou**
- não dá para saber qual cobrança foi revertida (o `Payment` não está no histórico — conservador).

Estornar **parcialmente**, ou uma cobrança **antiga** de quem hoje tem assinatura válida, **não**
derruba nada (X8).

### 8.9 — Sem acesso e retenção · cenários D1–D7
Sem assinatura com direito ao plano, todo endpoint gateado responde **402** (D7). Não há guard de rota
no frontend — o erro vira convite ao upgrade. A **exportação de dados** vive fora do gate (D6). A
retenção é uma **reconciliação idempotente** derivada do estado da assinatura do Owner (§10), não um
efeito colateral espalhado por cada handler que expira uma assinatura.

---

## 9. Pipeline de webhook (o coração)

`WebhooksController.Receive` (`POST /api/webhooks/{provider}`, anônimo):
1. Lê o corpo **raw** (`EnableBuffering`) — a verificação da assinatura precisa dos bytes exatos.
2. `processor.Parse(rawBody, Stripe-Signature)` — **verifica a assinatura ANTES de qualquer parse**
   (`EventUtility.ConstructEvent`, com tolerância de timestamp de `WebhookToleranceSeconds`). Assinatura
   inválida/ausente/expirada → `UnauthorizedException` → **401** (CG-10).
3. **Idempotência** por `(processor.Provider, evt.EventId)` — um evento (`evt_...`) já processado
   responde **200** sem reprocessar (CG-11). O `{provider}` da rota é cosmético; a idempotência usa
   `processor.Provider`.
4. `billingService.ProcessAsync` aplica o estado **e** grava o `WebhookEvent` no **mesmo
   `SaveChangesAsync`** — atômico (CG-12: se falhar, nada persiste e o Stripe reenvia com segurança).
5. Erro → **500** para o Stripe retentar (CG-13). Payload malformado (mas assinado) → **400** (não
   adianta reenviar o mesmo corpo).

### Reconciliação, não delta
Eventos `customer.subscription.*` trazem o **objeto inteiro**. `ReconcileSubscriptionAsync` aplica
esse estado — status, preço vigente (→ plano), período, agendamento — em vez de adivinhar o que mudou.
Consequências: a **ordem de entrega não importa**, a reentrega é no-op, e
renovação/troca-de-plano/promoção-de-downgrade passam todas pelo mesmo caminho. Passos:
1. `IsStale`? (ver abaixo) → descarta. Senão grava `GatewaySyncedAt = event.created`.
2. Captura `sub_` se veio.
3. `ApplySchedule`: `GatewayScheduleId = evt.ScheduleId`. Se o schedule sumiu (evt.ScheduleId nulo) e
   havia `PendingPlanId`, **limpa o agendamento** (ele foi liberado, consumido ou cancelado).
4. `ReconcilePlanAsync(evt.CurrentPriceId)`: resolve o `Plan` pelo preço vigente. Se mudou, atualiza
   `PlanId`. Se o preço == o do `PendingPlanId`, **promove** (limpa `PendingPlanId`). Preço fora do
   catálogo → mantém o atual + loga aviso (P11).
5. Traduz o `subscription.status`:

| Status Stripe | Efeito local |
|---|---|
| `active` / `trialing` | `Activate` → `Active`, `StartedAt ??= event.created`, `CurrentPeriodEnd` do item |
| `past_due` / `unpaid` / `paused` | **nada** — o acesso já caiu pelo período vencido; pode se recuperar (R5) |
| `incomplete` | nada (o 1º pagamento ainda não confirmou; segue `Pending`) |
| `incomplete_expired` | `Expired`, período agora |
| `canceled` | `ApplyCancelledCore` (idem `customer.subscription.deleted`) |

### `IsStale` — a defesa contra reentrega e desordem
`GatewaySyncedAt` guarda o `event.created` do **último evento de assinatura aplicado**. Um evento com
`event.created` **anterior** a esse é descartado. É o que faz um webhook **atrasado** (R8) não
reancorar o período "para agora", e um **duplicado/reentregue** (R7) não reaplicar. Vale para
`ReconcileSubscriptionAsync` e para o eco de `customer.subscription.deleted` (`ApplyCancelled`). Os
handlers de **cobrança** (`invoice.*`, `charge.*`) **não** passam por `IsStale` — são idempotentes
pela chave da cobrança.

### Datas: sempre do evento (RF-26 / CG-15)
`EventCreatedAt` (= `event.created`) é a âncora. Nenhum handler lê `DateTime.UtcNow` para calcular
período. O período de cada `Payment` vem das **linhas da fatura** (`invoice.lines[].period`), **não**
de `sub.CurrentPeriodEnd`: o evento de pagamento pode chegar *antes* do de renovação, e ler a data da
assinatura ali gravaria o período anterior no histórico. `UtcNow` só aparece em `UpdatedAt` (carimbo
de escrita, não regra de negócio).

### Resolução (do mais específico ao mais genérico)
- **Assinatura** (CG-16): `metadata.subscriptionId` → `client_reference_id` (via `ExternalId`) →
  `sub_` (id no gateway) → `metadata.userId` → `cus_` → (só na disputa, que não traz nada disso) o
  `Payment` resolvido pelo `pi_`. Só funciona por causa da invariante 1.
- **Payment** (CG-17): **estritamente** pelo `GatewayChargeId`. Sem fallback por "pendente mais
  recente" — numa renovação não há `Payment` pré-criado, e marcar um pendente avulso corromperia o
  histórico.

Um `invoice.paid` que não resolve assinatura é no-op, **mas emite `LogWarning`** (CG-18 — entrou
dinheiro que não foi registrado).

### Eventos × ações

| Evento Stripe | Tipo de domínio | Efeito |
|---|---|---|
| `invoice.paid` | `CheckoutCompleted` | cria/marca `Payment` `Paid`, período das linhas, `pi_`+`in_` |
| `charge.succeeded` | `ChargeSucceeded` | cartão + recibo no `Payment` (qualquer ordem; não cria se não achar) |
| `invoice.payment_failed` | `SubscriptionPaymentFailed` | `Payment` `Failed` + `RetryNumber` (idempotente por `in_`); **não** toca a assinatura |
| `customer.subscription.created` | `SubscriptionCompleted` | reconcilia (ativa, grava `StartedAt`) |
| `customer.subscription.updated` | `SubscriptionUpdated` | reconcilia (renovação, troca de plano, virada de agendamento) |
| `customer.subscription.deleted` | `SubscriptionCancelled` | `Canceled` (voluntário) / `Expired` (involuntário ou nunca-pago); **nunca** toca faturas; no-op em `RefundRequested` |
| `charge.refunded` | `CheckoutRefunded` | `Payment` `Refunded`; revoga acesso conforme `RevokesAccess` |
| `charge.dispute.created` | `CheckoutDisputed` | `Payment` `Disputed`; revoga (disputa = reversão total) |
| *(outros)* | `Unknown` | no-op registrado |

> **Nota sobre a chave `pi_` vs `in_`:** `invoice.paid` chaveia por `PaymentIntent` (`pi_`) porque é o
> único id que `charge.refunded`/`charge.dispute.created` também carregam — é o que amarra a fatura
> paga ao seu estorno. Se a fatura vier sem `pi_` (ex.: cupom de 100%), cai no `in_`. `charge.succeeded`
> chaveia por `pi_` e por isso converge na mesma linha, em qualquer ordem de chegada. `invoice.
> payment_failed` chaveia por `in_` (não há cobrança bem-sucedida, logo não há `pi_`).

---

## 10. Jobs

### `SubscriptionExpiryBackgroundService` (a cada 1h)
Roda tudo num scope próprio (o BackgroundService é singleton; repos/DbContext são scoped):
1. `Canceled` com `CurrentPeriodEnd < now` → `Expired`.
2. `Trialing` com `TrialEndsAt < now` → `Expired`.
3. `Pending` há mais de `CheckoutDefaults.PendingTtlHours` (24h) → `Expired`.
4. **Só depois** de expirar o que venceu: `DataRetentionRepository.SyncScheduledDeletionAsync(now, 90)`
   reconcilia a retenção.

### Retenção (`DataRetentionRepository`)
Reconciliação **idempotente**, derivada do estado da assinatura do Owner. Concentrar a regra aqui
evita espalhar `ScheduledDeletionAt` por todo handler que expira uma assinatura.

| Estado do Owner | `Tenant.ScheduledDeletionAt` |
|---|---|
| Assinatura com acesso | `null` (agendamento cancelado — D3) |
| Assinatura sem acesso | `AccessLostAt + 90d` (D1/D4) |
| **Nenhuma assinatura** | `Tenant.CreatedAt + 90d` (D2) |

Lojas **inativas** (encerradas manualmente pelo dono) são puladas — têm prazo próprio.

### `TenantDeletionBackgroundService` (a cada 24h)
Apaga permanentemente os tenants com `ScheduledDeletionAt <= now`. **Não filtra por `IsActive`** — a
loja fica ativa durante a retenção, e filtrar por `IsActive` deixaria de excluir justamente esses
casos (D5). Irreversível; o aviso é **in-app** (`DataDeletionBanner`, faixa não dispensável com
contagem regressiva + "Baixar meus dados" / "Assinar um plano"). Não há e-mail antes da exclusão.

---

## 11. Máquina de estados

```
Landing ?plano=<slug>
   └──▶ Trialing ──(job: TrialEndsAt vence)──────────▶ Expired
           └── cancel ─────────────────────────────────▶ Expired      (sem hard delete, sem logout)

checkout ──▶ Pending ──(customer.subscription.created)──▶ Active   [grava StartedAt]
               │                                           │
               │ (TTL 24h, job)                            ├── cancel ≤ 7d de StartedAt ──▶ RefundRequested
               ▼                                           │        └──(charge.refunded)──▶ Expired
            Expired                                        ├── cancel > 7d ───────────────▶ Canceled
                                                           │                                   │ (job)
                                                           ├── subscription.updated ──▶ Active ▼
                                                           └── payment_failed esgota ─────▶ Expired

Expired / Canceled(vencida) / None ──▶ reassinar (novo checkout, MESMA linha)
                                   └──▶ 90 dias de retenção → exclusão definitiva
```

A **troca de plano não muda o `Status`**: um upgrade troca `PlanId` na hora (e cobra o proporcional);
uma troca agendada grava `PendingPlanId` + `GatewayScheduleId`, promovidos na virada pelo reconciliador.
Sem assinatura viva = **acesso bloqueado (402)**, não "Free".

---

## 12. Matriz de cenários

Uma implementação está completa quando **todos** passam. Referência cruzada com onde cada um é tratado.

### Trial (§8.1)
| # | Cenário | Esperado |
|---|---|---|
| T1 | Cria loja com `?plano=`, nunca usou trial | `Trialing` 30d, gateway intocado |
| T2 | Cria 2ª loja, já usou trial | Sem trial; acesso vem da assinatura existente (RF-1) |
| T3 | Cria loja sem `?plano` | Sem assinatura → `/planos` |
| T4 | Trial vence | `Expired`, 402, retenção de 90d começa |
| T5 | Cancela no trial | `Expired` na hora, sem cobrança/estorno; loja e login preservados |
| T6 | Troca de plano no trial | Imediata, datas intactas, sem cobrança |
| T7 | Assina durante o trial | Bloqueado enquanto o trial vige |

### Checkout (§8.2–8.3)
| # | Cenário | Esperado |
|---|---|---|
| C1 | 1º checkout aprovado | `Pending` → webhook → `Active`, `StartedAt` gravado, fatura `Paid` |
| C2 | Fecha o checkout sem pagar | `Pending`; 24h → `Expired` |
| C3 | `Expired` reassina | Mesma linha, recorrência antiga cancelada no gateway, janela nova |
| C4 | `Canceled` dentro do período reassina | Permitido — a UI avisa cobrança imediata |
| C5 | `Active` tenta assinar de novo | 400 com a data de fim do período |
| C6 | `RefundRequested` tenta assinar | 400 "reembolso em análise" |
| C7 | Cartão recusado no checkout | Segue `Pending`; nada ativado; expira em 24h |
| C8 | Webhook chega antes do usuário voltar | Polling encontra `Active` na 1ª tentativa |
| C9 | Webhook nunca chega | `Pending`; polling estoura timeout; job expira em 24h |

### Renovação e dunning (§8.4–8.5)
| # | Cenário | Esperado |
|---|---|---|
| R1 | Renovação aprovada | Período estendido pela data do evento; `StartedAt` intacto; nova `Paid` |
| R2 | Renovação com downgrade agendado | Plano promovido **antes** de calcular o período |
| R3 | 1ª tentativa recusada | Fatura `Failed` (tentativa 1); assinatura inalterada; acesso já caiu |
| R4 | 2ª tentativa da mesma parcela | **Mesma** fatura, contador vai a 2; sem linha nova |
| R5 | Retentativa aprovada | Nova `Paid`; aviso some; período estendido |
| R6 | Tentativas esgotadas | `Expired`, período agora, sem cortesia |
| R7 | Webhook duplicado | Ignorado (idempotência); período **não** estende de novo |
| R8 | Webhook 6h atrasado | Período pela data do **evento**, não de agora (`IsStale`) |

### Troca de plano (§8.6)
| # | Cenário | Esperado |
|---|---|---|
| P1 | Essencial → Pro (mesmo ciclo) | Imediato; recursos Pro agora; **cobra o proporcional agora**; valor cheio na renovação |
| P2 | Pro → Essencial | **Agendado**; recursos Pro até a virada; Essencial na renovação |
| P3 | Mensal → Anual (mesmo tier) | Imediato (nada retirado, ciclo alonga) |
| P4 | Anual → Mensal (mesmo tier) | **Agendado** (encurta o ciclo já pago) — *nota: mais rígido que o AbacatePay, ver §15* |
| P5 | Downgrade agendado + upgrade | Agendamento liberado; upgrade vale agora |
| P6 | Downgrade agendado + reescolher atual | Agendamento cancelado; nada muda |
| P7 | Reescolher atual sem agendamento | 400 "Você já está neste plano" |
| P8 | Reescolher o mesmo já agendado | 400 "A troca já está agendada" |
| P9 | Downgrade agendado, renovação chega | Plano promovido, período com o **ciclo novo** |
| P10 | Downgrade agendado, cancela antes da virada | Cancelamento manda; o agendamento morre com a assinatura |
| P11 | Plano agendado some do catálogo | Mantém o atual + log; `PendingPlanId` limpo quando o schedule libera |
| P12 | Troca no trial | Imediata; `TrialEndsAt` preservado |

### Cancelamento, reembolso, chargeback (§8.7–8.8)
| # | Cenário | Esperado |
|---|---|---|
| X1 | Cancela no dia 3 | `RefundRequested`, acesso cai, estorno emitido |
| X2 | Estorno se consuma | Fatura `Refunded`, assinatura `Expired`, retenção começa |
| X3 | Cancela no dia 40 (mensal) | `Canceled`, acesso até o fim do período, sem estorno |
| X4 | Anual cancelada no dia 200 | `Canceled`, acesso pelos ~165 dias restantes |
| X5 | Renova e cancela 2d depois | **Fora** da janela (conta de `StartedAt`, não da renovação) |
| X6 | Reativa e cancela 2d depois | **Dentro** da janela (reativação gravou `StartedAt` novo) |
| X7 | Chargeback no período corrente | Fatura `Disputed`, assinatura `Expired` |
| X8 | Estorno de fatura antiga, assinante ativo | Fatura `Refunded`, **acesso preservado** |
| X9 | Eco do cancelamento em `RefundRequested` | No-op; espera o estorno |
| X10 | Eco do cancelamento por falta de pagamento | `Expired`, período agora |
| X11 | Cancela e tenta reassinar antes do estorno | Bloqueado (RF-19) |

### Retenção (§8.9, §10)
| # | Cenário | Esperado |
|---|---|---|
| D1 | Trial expira | Exclusão +90d; loja ativa; login funciona |
| D2 | Cria loja e nunca assina | Exclusão = criação da loja +90d |
| D3 | Assina no dia 80 da retenção | Agendamento cancelado |
| D4 | Cancela fora da janela | Agendamento conta do **fim do período pago** |
| D5 | Prazo vence | Tenant apagado **mesmo estando ativo** |
| D6 | Sem acesso exporta CSV | Permitido |
| D7 | Sem acesso abre módulo | 402 |

---

## 13. Setup do Stripe

1. **Produtos e preços:** rode `.claude/stripe-bootstrap/bootstrap.ps1` (precisa de `sk_test_...` em
   `$env:STRIPE_SECRET_KEY`). Cria os 4 produtos + preços recorrentes em **BRL**, idempotente por
   `lookup_key = slug`, e imprime as linhas `Stripe__Prices__<slug>=price_...` para o `.env`.
2. **Chaves no `.env`:** `Stripe__ApiKey` (`sk_...`) e `Stripe__WebhookSecret` (`whsec_...`). `__`
   vira chave aninhada (`Stripe:...`). Sem as chaves, a app sobe mas os planos ficam desativados.
3. **Webhook:** aponte um endpoint do Stripe para `POST /api/webhooks/stripe`, assinando **estes**
   eventos: `invoice.paid`, `invoice.payment_failed`, `charge.succeeded`, `charge.refunded`,
   `charge.dispute.created`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Em dev: `stripe listen --forward-to localhost:5000/api/webhooks/stripe`
   (ele imprime um `whsec_` efêmero — cole no `.env` e reinicie a API).
4. **Config avançada:** a política de retentativa (Smart Retries) é a **default da conta** — o PDV não
   a envia. Ajuste no Dashboard se precisar; `RF-27..29` não mudam, só quantas tentativas antes do `Expired`.

---

## 14. Como testar

O módulo foi validado nas duas direções; os artefatos ficam versionados:

**Chamadas de saída** (`IPaymentGateway` contra o Stripe de teste real): há um roteiro de referência
que instancia o `StripeGateway` real e exercita `PriceExistsAsync`, `EnsureCustomerAsync` (+ reuso por
e-mail), `CreateSubscriptionCheckoutAsync` (+ cupom inválido → 400), `PreviewUpgradeAsync`,
`UpgradeSubscriptionAsync` (proporcional cobrado), `ScheduleDowngradeAsync`, `ReleaseScheduleAsync`,
`RefundAsync` (idempotente) e `CancelSubscriptionAsync` (idempotente). Cria uma assinatura ativa de
verdade com `pm_card_visa`. Rode com uma chave `sk_test_...`.

**Webhooks** (`.claude/webhook-tests/`):
- `send-stripe-webhook.ps1` assina um fixture com o `whsec_` do `.env` (esquema `t=...,v1=HMAC`) e o
  POSTa em `/api/webhooks/stripe` — os **mesmos bytes** usados no HMAC. Dirige cenários exatos com os
  ids da sua base (evento atrasado, duplicado, downgrade agendado, etc.).
- `fixtures/` cobre cada evento; tokens `{{...}}` substituídos por `-Vars` (mais `EVENT_ID`,
  `CREATED`, `NOW_PLUS_1M/1Y` injetados). Ver o `README.md` para o mapa fixture → cenário.
- Alternativa ponta a ponta: `stripe listen` + `stripe trigger` contra a conta de teste (mas os
  eventos do CLI não trazem a nossa metadata — a resolução cai no `sub_`/`cus_`).

**Verificações de invariante** que quebram com mais frequência (checklist §12 do requirements): C8/C9
(ativação só por webhook), R7 (duplicado não estende), R8 (atrasado usa a data do evento), R2/P9
(promoção antes do cálculo do período), R4 (mesma parcela não cria linha), X5/X6 (janela conta de
`StartedAt`), X8 (estorno antigo não derruba ativo), X9 (eco preserva `RefundRequested`), C3 (sem duas
recorrências vivas), D5 (apaga tenant ativo), RF-10 (`Active` vencido perde acesso sem job), CG-12
(estado + evento no mesmo commit), CG-17 (fatura pelo id da cobrança).

---

## 15. Armadilhas de manutenção

- **API Basil (2025-06-30):** o período está no **item** da assinatura, não na assinatura; a cobrança
  da fatura está em `invoice.payments.data[].payment.payment_intent`; o link fatura→assinatura em
  `invoice.parent.subscription_details`. Ao subir o SDK, confira essas formas por reflexão antes de
  mexer no `StripeWebhookProcessor` — elas já mudaram uma vez.
- **`invoice.paid` precisa trazer o `pi_`.** A idempotência do `Payment` pago e o casamento com o
  estorno dependem dele. **Confirmado com eventos reais: o payload do webhook nunca traz
  `invoice.payments`** (é expandable, não vem por padrão). Por isso `StripeWebhookProcessor`
  busca a fatura de novo com `expand` quando `PaymentIntentIdOf` vem vazio
  (`FetchPaymentIntentIdAsync`) — sem isso, cai no fallback `in_` e o `charge.refunded` (que só
  tem `pi_`) não acha a linha.
- **O `IStripeClient` é singleton** e resolvido de forma preguiçosa: sem `Stripe:ApiKey` o **primeiro**
  request de checkout/troca/cancel dá 500 (config faltando). Desde o fix do `FetchPaymentIntentIdAsync`,
  o webhook de `invoice.paid` **também** precisa da ApiKey (chama a API de volta) — não é mais
  verdade que "webhooks não precisam".
- **`Subscription` nunca é soft-deleted.** Nenhum repositório filtra por `IsActive` — reintroduzir isso
  esconde a assinatura de quem cancelou (junto com o histórico). Foi armadilha antes; não repetir.
- **Reassinar cancela a assinatura antiga no gateway primeiro** (`DiscardGatewaySubscriptionAsync`) —
  senão ficam duas recorrências vivas e o `sub_` novo colide no índice único.
- **Um upgrade precisa liberar o schedule antes** (`ReleaseScheduleAsync`) — o Stripe recusa `update`
  de itens numa assinatura governada por schedule.
- **`dotnet watch` no container** não aplica bem mudança de assinatura sync↔async de um handler de
  webhook; ao mexer nesses métodos, `docker compose up -d api` para recriar antes de testar. Além
  disso, `env_file` do compose é lido na **criação** do container: mudou `.env`? recrie (`up -d`), não
  `restart`.
- **Casing dos entitlements:** `PlanJson` força `ToLowerInvariant()`; `EntitlementCatalog` e o frontend
  usam camelCase. Sempre comparar case-insensitive (no frontend, `entitlementSet()`).
- **Herança do AbacatePay que mudou de propósito:** P4 (anual→mensal) agora é **agendado** — antes era
  imediato porque o AbacatePay não tinha proporcional. Com o Stripe, tratamos o encurtamento de ciclo
  como "tirar tempo já pago". Se o produto quiser permitir a troca de ciclo imediata para baixo, é em
  `PlanChange.ShortensBillingCycle` que se mexe.
- **Exclusão e cobrança recusada sem e-mail:** todos os avisos são in-app. Se um dia entrar notificação
  por e-mail, os pontos são `TenantDeletionBackgroundService` (retenção) e a derivação de
  `lastPaymentFailedAt` em `/me` (dunning).
