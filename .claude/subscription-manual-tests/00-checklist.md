# Checklist de execução

Marque conforme executa. Um cenário só passa se **UI, banco e gateway** baterem.
Data da rodada: `____/____/______`  ·  Build/commit: `________________`

## Preparação
- [ ] `docker compose up -d` (API em `:5000`, front em `:5173`)
- [ ] `.env` com `Stripe__ApiKey`, `Stripe__WebhookSecret` e os 4 `Stripe__Prices__<slug>`
- [ ] `stripe listen --forward-to localhost:5000/api/webhooks/stripe` **rodando**
- [ ] Planos ativos no banco: `SELECT Slug, IsActive, ExternalProductId FROM Plans;` (4 linhas, todas `IsActive=1`)
- [ ] E-mail de teste limpo (`HasUsedTrial = 0`)

---

## Trial — [01](01-trial.md)
- [x] T1 · Cria loja com `?plano=` → `Trialing` 30d, `StartedAt` NULL, gateway intocado
- [x] T2 · 2ª loja, já usou trial → **uma** assinatura só
- [x] T3 · Loja sem `?plano=` → sem assinatura, vai para `/planos`
- [x] T4 · Trial vence → `Expired`, 402, retenção começa
- [x] T5 · Cancela no trial → `Expired` na hora, sem estorno, loja/login preservados
- [x] T6 · Troca no trial → imediata, `TrialEndsAt` intacto, sem cobrança
- [x] T7 · Assina durante o trial → **400**

## Checkout — [02](02-checkout.md)
- [ ] C1 · Checkout aprovado → `Pending` → webhook → `Active`, `StartedAt` gravado, fatura `Paid`
- [ ] C1b · **`Payments` vazio antes de pagar** (nenhum `Payment` nasce no checkout)
- [ ] C2 · Fecha sem pagar → `Pending`; 24h → `Expired`
- [ ] C3 · `Expired` reassina → mesma linha, `sub_` antigo **canceled** no gateway, janela nova
- [ ] C4 · `Canceled` dentro do período reassina → permitido
- [ ] C5 · `Active` assina de novo → **400**
- [ ] C6 · `RefundRequested` assina → **400**
- [ ] C7 · Cartão recusado → segue `Pending`, sem `Payment`
- [ ] C8 · Webhook antes do retorno → ativa na 1ª chamada do polling
- [ ] C8b · **Ordem invertida** (`invoice.paid` antes do `subscription.created`) → mesmo resultado
- [ ] C9 · Webhook nunca chega → `Pending`, timeout do polling, sem falso positivo

## Renovação e dunning — [03](03-renovacao-dunning.md)
- [ ] R1 · Renovação → período estendido pela data do **evento**, **`StartedAt` intacto**
- [ ] R2 · Renovação com downgrade agendado → plano **promovido antes** do cálculo do período
- [ ] R3 · 1ª recusa → `Payment` `Failed` (tentativa 1); **`Subscription` inalterada**
- [ ] R4 · 2ª tentativa da mesma parcela → **mesma linha**, `RetryNumber = 2`
- [ ] R5 · Retentativa aprovada → nova `Paid`; aviso some sozinho
- [ ] R6 · Tentativas esgotadas → `Expired`, período **agora**, sem cortesia
- [ ] R7 · Webhook duplicado → 200, **não** estende de novo
- [ ] R8 · Webhook 6h atrasado → usa a data do evento / descartado por `IsStale`

## Troca de plano — [04](04-troca-plano.md)
- [ ] P1 · Essencial → Pro → **imediato**, proporcional cobrado; preview == execução
- [ ] P2 · Pro → Essencial → **agendado**, `PendingPlanId` + `GatewayScheduleId`, nada cobrado
- [ ] P3 · Mensal → Anual → imediato
- [ ] P4 · Anual → Mensal → **agendado**
- [ ] P5 · Agendado + upgrade → schedule **liberado**, upgrade vale agora
- [ ] P6 · Agendado + reescolher atual → agendamento cancelado, nada cobrado
- [ ] P7 · Reescolher atual sem agendamento → **400**
- [ ] P8 · Reescolher o já agendado → **400**
- [ ] P9 · = R2
- [ ] P10 · Agendado + cancela → schedule **e** assinatura mortos, nada órfão no gateway
- [ ] P11 · Plano agendado sai do catálogo → mantém o atual + warning, HTTP 200
- [ ] P12 · = T6

## Cancelamento, reembolso, chargeback — [05](05-cancelamento-reembolso.md)
- [ ] X1 · Cancela no dia 3 → `RefundRequested`, acesso cai, **refund emitido no gateway**
- [ ] X2 · Estorno se consuma → `Payment` `Refunded`, assinatura `Expired`
- [ ] X3 · Cancela no dia 40 → `Canceled`, **`CurrentPeriodEnd` preservado**, sem estorno
- [ ] X4 · Anual no dia 200 → acesso pelos ~165 dias restantes
- [ ] X5 · Renova e cancela 2d depois → **fora** da janela (`Canceled`)
- [ ] X6 · Reativa e cancela 2d depois → **dentro** da janela (`RefundRequested`)
- [ ] X7 · Chargeback no período corrente → `Disputed` + `Expired`
- [ ] X8 · Estorno de fatura antiga, assinante ativo → **acesso preservado**
- [ ] X8b · Estorno **parcial** → não derruba
- [ ] X9 · Eco do cancelamento em `RefundRequested` → **no-op** (não vira `Canceled`)
- [ ] X10 · = R6
- [ ] X11 · = C6

## Retenção e acesso — [06](06-retencao-acesso.md)
- [ ] D1 · Trial expira → exclusão +90d, **loja ativa**, login funciona
- [ ] D2 · Nunca assinou → exclusão = criação da loja +90d
- [ ] D3 · Assina durante a retenção → `ScheduledDeletionAt` volta a **NULL**
- [ ] D4 · Cancela fora da janela → prazo conta do **fim do período pago**
- [ ] D5 · Prazo vence → tenant apagado **mesmo estando `IsActive = 1`**
- [ ] D6 · Sem acesso exporta CSV → **permitido** (fora do gate de plano)
- [ ] D7 · Sem acesso abre módulo → **402 `NOT_IN_PLAN`**; menu **não** escondido
- [ ] D7b · Estoura limite numérico → **402 `PLAN_LIMIT_EXCEEDED`**

## Plataforma / webhook — [07](07-webhook-plataforma.md)
- [ ] CG-10 · Assinatura inválida / ausente / expirada → **401**, nada persistido
- [ ] CG-11 · Mesmo `evt_` duas vezes → 200, efeito único
- [ ] CG-12 · Banco fora no meio → **500**, **nada** meio-aplicado; reenvio cura
- [ ] CG-13/14 · Malformado assinado → **400**; erro transitório → **500**
- [ ] CG-15 · Período do `Payment` vem das **linhas da fatura**
- [ ] CG-16 · Resolve sem metadata (por `sub_`, depois por `cus_`)
- [ ] CG-17 · `pi_` desconhecido → não marca linha alheia
- [ ] CG-18 · `invoice.paid` órfão → 200 + **`LogWarning`**
- [ ] Evento desconhecido → 200, no-op registrado

---

## As que quebram com mais frequência

Se o tempo for curto, rode **só estas** — são as invariantes que já regrediram antes:

| | Cenário | O que protege |
|---|---|---|
| [ ] | C9 | ativação só por webhook (sem falso positivo) |
| [ ] | C3 | duas recorrências vivas no gateway |
| [ ] | R7 / R8 | duplicado não estende; atrasado usa a data do evento |
| [ ] | R2 / P9 | promoção do plano **antes** do cálculo do período |
| [ ] | R4 | mesma parcela não cria linha nova |
| [ ] | X5 / X6 | a janela conta de `StartedAt` |
| [ ] | X8 | estorno antigo não derruba assinante ativo |
| [ ] | X9 | o eco preserva `RefundRequested` |
| [ ] | D5 | apaga tenant **ativo** |
| [ ] | CG-12 | estado + evento no mesmo commit |
| [ ] | CG-17 | fatura casada pelo id da cobrança |
