# Renovação e cobrança recusada — R1 a R8

Referência: [subscriptions.md §8.4–8.5](../../docs/subscriptions.md). Invariantes em jogo: **datas vêm
sempre do evento, nunca de `UtcNow`** (RF-26); **renovar não reabre a janela de reembolso** (RF-25);
**uma cobrança recusada não muda o `Status` da assinatura** (RF-27).

Renovação real levaria 30 dias, então estes cenários se dirigem por **fixtures assinados**
(`.claude/webhook-tests/`). Prepare uma vez:

```powershell
cd .claude\webhook-tests
$env:STRIPE_WEBHOOK_SECRET = 'whsec_...'    # o mesmo do .env

$ids = @{
  SUB_ID='<GatewaySubscriptionId da sua assinatura>'; CUS_ID='<GatewayCustomerId>'
  SUB_LOCAL='<Subscription.Id>'; USER_ID='<User.Id>'; PLAN_ID='<Plan.Id>'
  PRICE_ID='<price_ do plano vigente>'; INVOICE_ID='in_r1'; PI_ID='pi_r1'; AMOUNT=2999
}
```

**Pré comum a todos:** uma assinatura `Active` real (C1). Anote `StartedAt`, `CurrentPeriodEnd` e o
`GatewaySyncedAt` **antes** de cada envio.

---

## R1 — Renovação aprovada

**Passos**
```powershell
.\send-stripe-webhook.ps1 .\fixtures\subscription-updated-renewed.json -Vars $ids
.\send-stripe-webhook.ps1 .\fixtures\invoice-paid.json -Vars $ids
```

**Esperado**
- *Banco:* `CurrentPeriodEnd` **estendido** (calculado a partir do período **do evento**, não de agora).
  **`StartedAt` INTACTO** — o valor original do C1. `Status` segue `Active`. `GatewaySyncedAt` avança.
  Nova linha em `Payments` `Paid`, com `PeriodStart`/`PeriodEnd` do **novo** ciclo.
- *UI:* a data da próxima cobrança avança; o histórico ganha uma linha.

> `StartedAt` intacto é o que faz o X5 dar "fora da janela". Se ele se moveu, a renovação está
> reabrindo o direito ao reembolso — bug.

---

## R2 — Renovação com downgrade agendado (promoção antes do cálculo)

**Pré:** faça o P2 primeiro (Pro → Essencial agendado). Confirme `PendingPlanId` preenchido e
`GatewayScheduleId` = `sub_sched_...`.

**Passos**
1. Envie a renovação **já com o preço do plano agendado** e **sem** schedule (ele foi consumido):
   ```powershell
   $r2 = $ids.Clone()
   $r2.PRICE_ID = '<price_ do essencial-mensal>'   # o preço NOVO
   $r2.INVOICE_ID = 'in_r2'; $r2.PI_ID = 'pi_r2'; $r2.AMOUNT = 2999
   .\send-stripe-webhook.ps1 .\fixtures\subscription-updated-renewed.json -Vars $r2
   ```

**Esperado**
- *Banco:* `PlanId` = **essencial-mensal** (promovido), `PendingPlanId` **NULL**, `GatewayScheduleId`
  **NULL**. `CurrentPeriodEnd` calculado com o **ciclo novo**.
- *UI:* o aviso de "troca agendada" some; o plano vigente passa a ser o Essencial; as features Pro
  somem.

> A promoção acontece no **reconciliador**, derivada do preço vigente do evento — nunca otimista no
> `change-plan`. É o mesmo caminho que cobre trocas feitas fora do app.

---

## R3 — Primeira tentativa recusada

**Passos**
```powershell
$f = $ids.Clone(); $f.INVOICE_ID = 'in_fail1'; $f.ATTEMPT = 1
.\send-stripe-webhook.ps1 .\fixtures\invoice-payment-failed.json -Vars $f
```

**Esperado**
- *Banco:* nova linha em `Payments` `Status = Failed`, `RetryNumber = 1`, `GatewayChargeId = in_fail1`
  (a chave é a **fatura**, não um `pi_` — não houve cobrança bem-sucedida).
  **A `Subscription` NÃO muda**: `Status` segue `Active`, `CurrentPeriodEnd` idem.
- *UI:* `PaymentFailedModal` aparece **1× na sessão**; alerta permanente na tela de assinatura;
  histórico mostra "Recusado (tentativa 1)".
- *API:* `/me` traz `lastPaymentFailedAt` e `paymentRetryNumber: 1`.

> O acesso cai sozinho quando `CurrentPeriodEnd` vence — não é a falha que o derruba. Se quiser ver o
> acesso caindo, recue `CurrentPeriodEnd` para o passado e recarregue: 402, **sem** job.

---

## R4 — Segunda tentativa da **mesma** parcela

**Passos**
```powershell
$f.ATTEMPT = 2
.\send-stripe-webhook.ps1 .\fixtures\invoice-payment-failed.json -Vars $f   # MESMA INVOICE_ID
```

**Esperado**
- *Banco:* **continua uma única** linha `Failed` para `in_fail1`, agora com `RetryNumber = 2`.
  **Nenhuma linha nova.**
- *UI:* histórico mostra "Recusado (tentativa 2)".

**Como falha:** se aparecerem duas linhas `Failed`, a idempotência por `in_` quebrou.

---

## R5 — Retentativa aprovada

**Passos**
```powershell
$ok = $ids.Clone(); $ok.INVOICE_ID = 'in_fail1'; $ok.PI_ID = 'pi_ok1'   # mesma fatura, agora paga
.\send-stripe-webhook.ps1 .\fixtures\invoice-paid.json -Vars $ok
.\send-stripe-webhook.ps1 .\fixtures\subscription-updated-renewed.json -Vars $ok
```

**Esperado**
- *Banco:* nova linha `Paid` (chaveada por `pi_ok1`), mais recente que a `Failed`. `CurrentPeriodEnd`
  estendido.
- *UI:* o aviso de cobrança recusada **some sozinho** — ele é derivado da **última** cobrança.
  O `PaymentFailedModal` não volta.

---

## R6 — Tentativas esgotadas

**Passos**
```powershell
.\send-stripe-webhook.ps1 .\fixtures\subscription-deleted-payment-failed.json -Vars $ids
```

**Esperado**
- *Banco:* `Status = Expired`, `CurrentPeriodEnd = event.created` (**agora**, sem cortesia),
  `CanceledAt` preenchido. As linhas de `Payments` **não são tocadas**.
- *UI:* `SubscriptionExpiredModal`; módulos → 402. Loja ativa, login funcionando.
- *Retenção:* `ScheduledDeletionAt = now + 90d` após o job.

---

## R7 — Webhook duplicado (idempotência)

**Passos**
1. Reenvie o **mesmo evento** do R1. Como o script gera um `EVENT_ID` novo a cada envio, force o
   mesmo id para exercitar a dedução:
   ```powershell
   $dup = $ids.Clone(); $dup.EVENT_ID = 'evt_duplicado_teste'
   .\send-stripe-webhook.ps1 .\fixtures\invoice-paid.json -Vars $dup    # 1ª vez: processa
   .\send-stripe-webhook.ps1 .\fixtures\invoice-paid.json -Vars $dup    # 2ª vez: dedup
   ```

**Esperado**
- *HTTP:* **200** nas duas (o Stripe não deve retentar).
- *Banco:* **uma única** linha em `WebhookEvents` para `evt_duplicado_teste`; **uma única** linha em
  `Payments`; `CurrentPeriodEnd` **não** estendeu duas vezes.

**Camada 2 (mesmo evento, id diferente):** reenvie o `invoice-paid` com `EVENT_ID` novo, mesmo `PI_ID`.
Ainda assim deve haver **uma só** linha em `Payments` — a idempotência da cobrança é pelo
`GatewayChargeId`, independente da do evento.

---

## R8 — Webhook 6h atrasado

**Passos**
```powershell
$late = $ids.Clone()
$late.CREATED = [DateTimeOffset]::UtcNow.AddHours(-6).ToUnixTimeSeconds()
.\send-stripe-webhook.ps1 .\fixtures\subscription-updated-renewed.json -Vars $late
```

**Esperado**
- *Banco:* o período é calculado pela data **do evento** (6h atrás), não "para agora". Se o
  `GatewaySyncedAt` já for **mais recente** que esse `event.created`, o evento é **descartado
  inteiro** (`IsStale`) — `CurrentPeriodEnd` e `GatewaySyncedAt` ficam **inalterados**.
- *HTTP:* 200 (descartar não é erro).

**Como falha:** se `CurrentPeriodEnd` for reancorado para `now + 30d`, o handler está lendo `UtcNow` —
o usuário ganharia 6h de graça a cada webhook atrasado.
