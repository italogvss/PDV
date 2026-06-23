# Problemas e lacunas — Fluxo de assinatura (Cartão)

> Escopo: fluxo de **cartão** (recorrente). Itens marcados por severidade.
> 🔴 bug/risco real · 🟠 inconsistência/lacuna funcional · 🟡 UX/limpeza · ⚪ observação
> ✅ corrigido · 🗑️ removido (feature cortada)
>
> _Atualizado em 2026-06-23 após revisão do código atual._

---

## ✅ Corrigidos / Removidos

### ✅ 1. Extensão de período não-idempotente em reprocessamento de webhook
`ProcessAsync` agora grava o estado da assinatura **e** registra o `WebhookEvent` (Processed) no **mesmo `SaveChangesAsync`** — atômico. Se o `SaveChanges` falhar, nada é persistido e o gateway pode reenviar com segurança. A janela de reprocessamento duplo foi eliminada.
- `WebhooksController.cs:46-57`, `BillingWebhookService.cs:65-76`.

### ✅ 2. Período de planos anuais no cartão sempre virava +1 mês
Introduzido `NextPeriodEnd(from, plan)` que usa `AddYears(1)` para `BillingPeriod.Annual` e `AddMonths(1)` para mensal. Usado em `ApplySubscriptionActive` e `ApplyRenewed`.
- `BillingWebhookService.cs:139-140`.

### ✅ 3. `change-plan` com plano de trial diferente podia reabrir trial já usado
`ChangePlanAsync` agora bloqueia explicitamente: se a sub **não** está em trial, não é possível trocar para plano com `TrialDays` (`BusinessException`). Em trial, a troca para outro plano com trial recalcula o prazo — comportamento intencional (usuário ainda está no período de avaliação).
- `SubscriptionService.cs:129-130`.

### ✅ 4. "Próximo ciclo" vs aplicação imediata na troca de plano
`ChangePlanAsync` aplica a troca **imediatamente**: troca o produto no gateway e atualiza `PlanId` local na hora. `ApplyPlanChangedAsync` virou confirmação idempotente (reconcilia `PlanId` sem alterar datas). Frontend: toast "Plano alterado." e botão "Trocar plano" (sem promessa de "próximo ciclo").
- `SubscriptionService.cs:108-145`, `BillingWebhookService.cs:200-220`.

### 🗑️ 5. `IsRenewalScheduled` não disparava nada
Feature de "Agendar renovação" removida inteiramente. Endpoints `POST /schedule-renewal` e `DELETE /schedule-renewal` não existem mais. Hooks `useScheduleRenewal`/`useCancelScheduledRenewal` removidos. O campo `IsRenewalScheduled` ainda existe na entidade mas não é mais escrito por nenhum fluxo ativo.

### ✅ 12. Logs de fluxo normal em nível `Warning`
`WebhooksController` e `BillingWebhookService` agora usam `LogInformation` para eventos do caminho feliz.
- `WebhooksController.cs:39,43`, `BillingWebhookService.cs:19-22`.

### ✅ 13. Duas gravações separadas no webhook (sem transação única)
Resolvido junto com o item 1 — único `SaveChangesAsync` cobre estado + `WebhookEvent`.

### ✅ 18. `PeriodStart`/`PeriodEnd` do `Payment` não preenchidos no cartão
`SetPeriod` é chamado em `CompleteChargeAsync` para todos os pagamentos (cartão e PIX).
- `BillingWebhookService.cs:259-263`.

---

## 🟠 Lacunas funcionais abertas

### 6. Sem transição para `Expired` por vencimento
Quando uma assinatura `Canceled` ultrapassa `CurrentPeriodEnd`, ela permanece com `Status = Canceled` para sempre (o entitlement cai corretamente para Free, mas o **status** não reflete o vencimento). O frontend exibe "CANCELADO / Acesso até {data passada}".
- `Expired` só é setado em refund/dispute (`ApplyReversed`). Não há job/cron de varredura.
- **Sugestão:** calcular o status efetivo em `GetMineAsync` (sem alterar banco) ou job periódico que marque `Expired`.

### 7. Status `PastDue` definido mas nunca usado
`SubscriptionStatus.PastDue` existe no enum e no frontend (`STATUS_CONFIG`), mas nenhum handler de webhook o atribui. Falhas de cobrança/retentativa do cartão não têm evento mapeado — uma renovação que falha não altera o estado local.
- `AbacatePayWebhookProcessor.MapType` não cobre eventos de falha de pagamento.
- **Sugestão:** mapear evento de falha do AbacatePay → `PastDue`.

### 8. Histórico de cobranças (`Payment`) nunca é exposto ao usuário
`PaymentRepository.GetByUserIdAsync(userId, page, pageSize)` existe e é paginado, mas **nenhum controller o expõe**. A aba "Faturas" no frontend continua com dados hardcoded (ou inexistente). O histórico real é acessível apenas via admin.
- `PaymentRepository.cs:22-33`.
- **Sugestão:** `GET /subscriptions/payments?page=1&pageSize=20` → `SubscriptionsController`.

---

## 🟡 UX / consistência abertos

### 9. Troca de plano sem confirmação
`handlePlanAction` chama `changePlan.mutate(plan.id)` direto ao clicar "Trocar plano" — sem modal de confirmação nem aviso de cobrança. Risco de troca acidental (diferente do cancelamento, que tem `window.confirm`).
- `SubscriptionSection/index.tsx:73-79`.

### 10. `change-plan` durante trial sem `GatewaySubscriptionId`
`ChangePlanAsync` exige `GatewaySubscriptionId` (lança `BusinessException` se ausente). Se o webhook `subscription.trial_started` ainda não chegou logo após assinar, o botão "Trocar plano" aparece mas a ação falha. Janela curta mas visível ao usuário.

### 11. Banner mostra "CANCELADO / Acesso até {data}" com data no passado
Decorre do item 6: enquanto não há transição para `Expired`, o banner exibe a data de `CurrentPeriodEnd` mesmo após vencida.

### 🟡 19. Reativação dentro do período pago sem alerta
`StartCheckoutAsync` agora **permite** novo checkout com `Status = Canceled` mesmo se `CurrentPeriodEnd` ainda está no futuro. O usuário pode pagar um novo ciclo antes de aproveitar o período restante sem aviso. Antes havia bloqueio nesse caso (mudança introduzida no refactor).
- `SubscriptionService.cs:71-78`.
- **Sugestão:** alert ou texto informativo no frontend ("Você ainda tem acesso até {data}. Deseja mesmo contratar agora?").

### 🟡 20. `console.log(plans)` em produção
`SubscriptionSection/index.tsx:37-39` tem um `console.log(plans)` de debug não removido.

---

## ⚪ Observações / pontos a validar

### 14. Idempotência de `checkout.*` por hash do corpo
`EventId` de `checkout.completed` é o hash SHA256 do corpo. Funciona porque cada renovação tem corpo distinto. Se o gateway reenviar o **mesmo** corpo exato, é idempotente. Mas reserialização/normalização pelo gateway quebraria a deduplicação. Validar com o comportamento real do AbacatePay.

### 15. `ResolveSubscriptionAsync` por `CustomerId` assume 1 sub viva por cliente
No fallback de renovação, resolve via `cust_` → `UserId` → `GetLiveSubscriptionByUserIdAsync`. O design garante "uma assinatura viva por usuário", mas se a invariante quebrar, a renovação pode cair na errada.

### 16. `CancelAsync` chama o gateway antes de persistir o estado local
Se o gateway cancela e a persistência local falha depois, fica dessincronizado até o webhook `subscription.cancelled` reconciliar. O webhook cobre isso (idempotente) — apenas registrar a dependência.

### 17. `GetLiveByUserIdAsync` ordena por `CreatedAt` desc com filtro `IsActive`
Confirmar que nenhum fluxo faz soft delete de `Subscription` (IsActive = false), pois isso removeria a sub do filtro e o usuário perderia o histórico de entitlement.