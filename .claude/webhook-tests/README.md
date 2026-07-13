# Webhooks do Stripe — teste local

Dois caminhos para exercitar o pipeline de webhook (`POST /api/webhooks/stripe`):

## 1. Fixtures assinados (offline, sem Stripe)

`send-stripe-webhook.ps1` assina um fixture com o `whsec_...` do `.env` e o envia. Serve para
dirigir **cenários exatos** com os ids da sua base — inclusive os que o Stripe CLI não reproduz
facilmente (evento atrasado, duplicado, downgrade agendado).

```powershell
$env:STRIPE_WEBHOOK_SECRET = 'whsec_...'   # o mesmo do .env

# Ativação: cria a assinatura no gateway e paga a primeira fatura.
$ids = @{ SUB_ID='sub_1'; CUS_ID='cus_1'; SUB_LOCAL='<Subscription.Id>'; USER_ID='<User.Id>'; PLAN_ID='<Plan.Id>'; PRICE_ID='price_...'; INVOICE_ID='in_1'; PI_ID='pi_1'; AMOUNT=2999 }
.\send-stripe-webhook.ps1 .\fixtures\subscription-created.json -Vars $ids
.\send-stripe-webhook.ps1 .\fixtures\invoice-paid.json         -Vars $ids
.\send-stripe-webhook.ps1 .\fixtures\charge-succeeded.json     -Vars $ids   # cartão no histórico
```

Tokens injetados automaticamente: `EVENT_ID` (único por envio), `CREATED`/`NOW`, `NOW_PLUS_1M`,
`NOW_PLUS_1Y`. Veja o cabeçalho do script.

### Cenários prontos

| Fixture | Cobre |
|---|---|
| `subscription-created.json` | C1/C8 — ativação (`StartedAt`, período, `sub_`) |
| `invoice-paid.json` | C1/R1 — fatura paga; reenvie para R7 (idempotência: 200, sem novo período) |
| `charge-succeeded.json` | cartão no histórico; chega em qualquer ordem |
| `invoice-payment-failed.json` (`ATTEMPT`) | R3/R4 — dunning; reenvie com `ATTEMPT` maior, mesma `INVOICE_ID` |
| `subscription-updated-renewed.json` | R1/R8 — renovação; use `CREATED` no passado para R8 |
| `subscription-updated-downgrade-scheduled.json` (`SCHEDULE_ID`) | P2 — grava o agendamento |
| `subscription-deleted.json` | X3 — cancelamento voluntário (`Canceled`) |
| `subscription-deleted-payment-failed.json` | R6/X10 — cancelamento involuntário (`Expired`, agora) |
| `charge-refunded.json` | X2/X8 — estorno (derruba conforme RF-42) |
| `charge-dispute-created.json` | X7 — chargeback (`Disputed`, revoga) |
| `unknown-event.json` | evento fora do contrato → no-op registrado |

Para R8 (evento atrasado): `-Vars @{ CREATED = (Get-Date).AddHours(-6) ... }` — o handler usa a data
do evento, então o período não é reancorado "para agora".

## 2. Stripe CLI (contra a conta de teste real)

Encaminha os eventos reais do Stripe para a API local — melhor para o fluxo ponta a ponta:

```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
# imprime um whsec_... efêmero → cole em Stripe__WebhookSecret no .env e reinicie a API
stripe trigger invoice.paid
```

Os eventos disparados pelo CLI não trazem a nossa `metadata`/`client_reference_id`, então a
resolução cai no `sub_`/`cus_` (CG-16). Para exercitar a metadata, use os fixtures do item 1.
