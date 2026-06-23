# Problemas e lacunas — Fluxo de assinatura (Cartão)

> Escopo: fluxo de **cartão** (recorrente). Itens marcados por severidade.
> 🔴 bug/risco real · 🟠 inconsistência/lacuna funcional · 🟡 UX/limpeza · ⚪ observação

---

## 🔴 Bugs de lógica

### 1. Extensão de período não-idempotente em reprocessamento de webhook
`WebhooksController` chama `billingService.ProcessAsync` (que faz `SaveChangesAsync`) e **só depois** `RecordEventAsync` (outro `SaveChangesAsync`). Se o processamento salvar com sucesso mas o `RecordEventAsync` falhar, o evento **não é registrado como `Processed`** → o gateway reenvia → reprocessa.

Ao reprocessar `subscription.completed` / `subscription.renewed` / `subscription.plan_changed`, o handler faz `CurrentPeriodEnd = DateTime.UtcNow.AddMonths(1)` **a partir de agora**, empurrando o fim do período para frente a cada reprocessamento. Não é idempotente.
- Arquivos: `WebhooksController.cs:46-63`, `BillingWebhookService.cs:116-160,199-238`.
- Sugestão: registrar o `WebhookEvent` na **mesma transação** do processamento; e/ou calcular `CurrentPeriodEnd` a partir do período anterior, não de `now`.

### 2. Período de planos ANUAIS no cartão sempre vira +1 mês
Existem planos de cartão anuais no seed (`prod_*_annual_*`, `SupportsCard: true`). Mas todos os handlers de cartão fazem `CurrentPeriodEnd = now.AddMonths(1)` fixo:
- `ApplySubscriptionActive` (`BillingWebhookService.cs:123`)
- `ApplyRenewed` (`:158`)
- `ApplyPlanChangedAsync` (`:230`)

Para uma assinatura **anual no cartão**, o `CurrentPeriodEnd` fica 1 mês em vez de 1 ano → entitlement expira cedo demais (embora o gateway só cobre/renove anualmente). O cartão não carrega o período (diferente do PIX, que lê `metadata["period"]`).
- Sugestão: derivar a frequência do plano/produto (mensal vs anual) e estender o período corretamente.

### 3. `change-plan` com plano de trial diferente pode reabrir trial já usado
`ApplyPlanChangedAsync` (`:219-226`): se a sub está em trial e o **novo** plano tem `TrialDays`, faz `TrialEndsAt = now + TrialDays` — reinicia o trial. Como o gate de "já usou trial" só existe no `StartCheckoutAsync` (não no `change-plan`), um usuário em trial pode trocar para outro plano com trial e **esticar o período gratuito**. Verificar se é intencional.

---

## 🟠 Inconsistências e lacunas funcionais

### 4. "Próximo ciclo" vs aplicação imediata na troca de plano
Frontend (`useChangePlan`) e `ChangePlanAsync` comunicam **"agendada para o próximo ciclo"** (`PendingPlanId`). Mas o webhook `subscription.plan_changed` (`ApplyPlanChangedAsync`), **fora de trial**, aplica a troca **imediatamente** e faz `Status=Active` + `CurrentPeriodEnd = now+1mês`. O próprio `fluxo-abacate-pay.md` é ambíguo (texto diz "próximo ciclo", mas o exemplo traz `checkout.status: PAID` com cobrança imediata).
- Efeito: a UI promete uma coisa e o backend faz outra. Decidir e alinhar a expectativa (mensagem + comportamento).

### 5. `IsRenewalScheduled` não dispara nada
"Agendar renovação" (`ScheduleRenewalAsync`) apenas seta a flag. **Não há job/cron** que lembre o usuário nem que re-contrate ao fim do período. A flag é puramente visual e é apagada no próximo checkout. Ou se documenta como "lembrete visual", ou se implementa o agendador.
- Arquivos: `SubscriptionService.cs:111-130`.

### 6. Sem transição para `Expired` por vencimento
Quando uma assinatura `Canceled` ultrapassa `CurrentPeriodEnd`, ela continua com `Status = Canceled` para sempre (entitlement já cai para Free corretamente, mas o **status** não reflete o vencimento). O frontend continua exibindo o chip "CANCELADO" com "Acesso até {data passada}".
- Não há rotina que marque `Expired` por tempo. `Expired` só é setado em refund/dispute (`ApplyReversed`).
- Sugestão: job de varredura ou cálculo de status efetivo no `GetMineAsync`.

### 7. Status `PastDue` definido mas nunca usado
`SubscriptionStatus.PastDue` existe no enum, no frontend (`STATUS_CONFIG`, `getStatusLine`) e no contrato, mas **nenhum handler de webhook o atribui**. Falhas de cobrança/retentativa do cartão (AbacatePay tem `retryPolicy`/`maxRetry`) não têm evento tratado — não há `subscription.payment_failed` mapeado. Uma cobrança recorrente que falha não muda o estado local.
- `AbacatePayWebhookProcessor.MapType` não cobre eventos de falha de pagamento.

### 8. Histórico de cobranças (`Payment`) nunca é exposto ao usuário
Os webhooks gravam `Payment` com toda a info (valor, cartão, recibo, datas), e existe `PaymentRepository.GetByUserIdAsync(userId, page, pageSize)` paginado — mas **nenhum controller o chama**. A aba "Faturas" (`BillingPaymentsSection`) é **100% mockada** (cartões e dados de cobrança hardcoded). O histórico real é consumido só pelo `AdminService.GetAllPaymentsAsync` (visão admin).
- Recurso construído e não utilizado: endpoint de histórico de faturas do próprio Owner.
- Arquivos: `PaymentRepository.cs:22`, `BillingPaymentsSection/index.tsx` (dados fixos).

---

## 🟡 UX / consistência

### 9. Troca de plano sem confirmação
`handlePlanAction` chama `changePlan.mutate(plan.id)` direto ao clicar "Trocar plano" — sem modal de confirmação nem aviso de cobrança/proração (diferente do cancelamento, que tem `window.confirm`). Risco de troca acidental.
- `SubscriptionSection/index.tsx:78-85`.

### 10. `change-plan` durante trial sem `GatewaySubscriptionId`
`isLive` inclui `Trialing`, então o botão "Trocar plano" aparece em trial. Mas se o webhook `subscription.trial_started` ainda não chegou (sem `GatewaySubscriptionId`), `ChangePlanAsync` lança `BusinessException`. Janela curta, mas possível erro ao usuário logo após assinar.

### 11. Banner mostra "CANCELADO / Acesso até {data}" com data no passado
Decorre do item 6: enquanto não há transição para Free/Expired, o banner pode exibir uma data de acesso já vencida.

### 12. Logs de fluxo normal em nível `Warning`
`BillingWebhookService` e `WebhooksController` usam `logger.LogWarning` para o caminho feliz ("Assinatura resolvida", "Webhook recebido", "Evento já processado"). Polui o canal de warnings/alertas. Deveria ser `LogInformation`/`LogDebug`.
- `BillingWebhookService.cs:19-22`, `WebhooksController.cs:40-44`.

---

## ⚪ Observações / pontos a validar

### 13. Duas gravações separadas no webhook (sem transação única)
Ver item 1 — `ProcessAsync` e `RecordEventAsync` salvam em chamadas distintas. Mesmo sem o cenário de erro, vale unificar em uma transação para consistência.

### 14. Idempotência de `checkout.*` por hash do corpo
`EventId` de `checkout.completed` é o hash SHA256 do corpo. Funciona porque cada renovação tem corpo distinto (datas diferentes). Se o gateway reenviar o **mesmo** corpo, é idempotente. Mas note que isso acopla a idempotência ao formato exato do payload — qualquer reserialização/normalização pelo gateway quebraria a deduplicação. Validar com o comportamento real do AbacatePay.

### 15. `ResolveSubscriptionAsync` por `CustomerId` assume 1 sub viva por cliente
No fallback de renovação, resolve via `cust_` → `UserId` → `GetLiveSubscriptionByUserIdAsync` (a mais recente ativa). O design garante "uma assinatura viva por usuário", mas se essa invariante quebrar (ex.: duas subs ativas), a renovação pode cair na errada.

### 16. `CancelAsync` chama o gateway antes de persistir o estado local
Se `gateway.CancelSubscriptionAsync` lança, o estado local não muda (ok). Mas se o gateway cancela e a persistência local falha depois, fica dessincronizado até o webhook `subscription.cancelled` reconciliar. O webhook cobre isso (idempotente), então é aceitável — apenas registrar a dependência.

### 17. `GetLiveByUserIdAsync` ordena por `CreatedAt` desc com filtro `IsActive`
Soft delete (`IsActive`) some com a sub do filtro. Como a sub é reaproveitada (uma por usuário), `IsActive=false` em sub de assinatura não parece ocorrer no fluxo — confirmar que nada faz soft delete de `Subscription` (senão o usuário perderia o histórico de entitlement).

### 18. `PeriodStart`/`PeriodEnd` do `Payment` não preenchidos no cartão
São setados apenas no fluxo PIX (`ApplyPixCompletedAsync`). No cartão, os `Payment` criados/marcados em `CompleteChargeAsync` ficam com `PeriodStart/End` nulos. Se a futura tela de faturas exibir o período coberto, faltará esse dado para cartão.
