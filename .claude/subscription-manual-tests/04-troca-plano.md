# Troca de plano — P1 a P12

Referência: [subscriptions.md §8.6](../../docs/subscriptions.md). A invariante que explica **toda** a
assimetria: **o usuário nunca perde, no meio de um ciclo já pago, algo pelo qual pagou** — nem uma
capability, nem tempo de serviço. Por isso downgrade e encurtamento de ciclo são **agendados**, e só o
upgrade é imediato (com proporcional cobrado na hora).

Classificação esperada no catálogo atual:

| De → Para | Esperado |
|---|---|
| Essencial → Pro (qualquer ciclo) | **imediato** + cobra proporcional |
| Mensal → Anual (mesmo tier) | **imediato** + cobra proporcional |
| Anual → Mensal (mesmo tier) | **agendado** (encurta o ciclo pago) |
| Pro → Essencial (qualquer ciclo) | **agendado** (retira features/limites) |

Antes de confirmar qualquer troca, a UI chama `change-plan/preview`. **Compare sempre preview vs.
execução** — o mesmo shape, os mesmos valores.

---

## P1 — Essencial Mensal → Profissional Mensal

**Pré:** `Active` no Essencial Mensal (C1), alguns dias dentro do ciclo.

**Passos**
1. Assinatura → Trocar plano → Profissional Mensal.
2. **Leia o diálogo antes de confirmar.**
3. Confirme.

**Esperado**
- *UI (preview):* mostra o valor exato do proporcional ("Será cobrado R$ 12,47 agora") e a data da
  próxima cobrança. O botão de confirmar **só habilita depois que o preview chega**.
- *API:* `scheduled: false`, `effectiveAt` = agora, `amountDueNowCents` > 0, `nextChargeAt` = fim do
  período. **O `preview` e o `change-plan` devolvem os mesmos números.**
- *Banco:* `PlanId` = profissional-mensal **na hora**; `PendingPlanId` NULL; `CurrentPeriodEnd`
  reancorado pela resposta do gateway. Após o webhook, **nova linha `Payments` `Paid`** com o valor
  proporcional.
- *UI (depois):* features Pro disponíveis imediatamente.
- *Gateway:* a assinatura trocou de preço; há uma fatura extra (`proration_behavior = always_invoice`).

**Na renovação seguinte** cobra-se o **valor cheio** do Pro (R$ 49,99), não o proporcional.

---

## P2 — Profissional → Essencial (downgrade)

**Pré:** `Active` no Profissional Mensal.

**Passos**
1. Trocar plano → Essencial Mensal. **Leia o diálogo.** Confirme.

**Esperado**
- *UI (preview):* **lista as features que serão perdidas** e a data de vigência ("a partir de
  DD/MM"). **Nenhum valor a cobrar.**
- *API:* `scheduled: true`, `effectiveAt` = fim do período, `nextChargeAt` = fim do período,
  `amountDueNowCents: 0`.
- *Banco:* `PlanId` **continua** profissional-mensal; **`PendingPlanId`** = essencial-mensal;
  `GatewayScheduleId` = `sub_sched_...`. **Nenhuma** linha nova em `Payments` — nada cobrado, **nada
  creditado**.
- *UI (depois):* as features Pro **continuam funcionando**; um aviso informa a troca agendada e quando
  ela vale.
- *Gateway:* existe um **Subscription Schedule** de 2 fases (atual até o fim do período; depois, o
  preço novo).

A promoção para o plano novo é o **R2** — não acontece aqui.

---

## P3 — Mensal → Anual (mesmo tier)

**Esperado:** **imediato** (nada é retirado; o ciclo alonga). Mesmo comportamento do P1: proporcional
cobrado agora, `PlanId` muda na hora, `CurrentPeriodEnd` vai para ~1 ano.

---

## P4 — Anual → Mensal (mesmo tier)

**Pré:** `Active` no Essencial Anual.

**Esperado:** **agendado**, como o P2 — `PendingPlanId` = essencial-mensal, `GatewayScheduleId`
preenchido, nada cobrado. O acesso anual continua até o fim do ciclo pago.

- *UI:* o diálogo **não** lista features perdidas (nenhuma é: mesmo tier) — só a data de vigência.
  Encurtar o ciclo tira **tempo** já pago, não recurso.

> Regra deliberada e mais rígida que a do gateway antigo. Se o produto mudar de ideia, o ponto é
> `PlanChange.ShortensBillingCycle`.

---

## P5 — Downgrade agendado + upgrade (o upgrade cancela o agendamento)

**Pré:** P2 feito — `PendingPlanId` e `GatewayScheduleId` preenchidos.

**Passos**
1. Trocar plano → **Profissional Anual** (um upgrade).

**Esperado**
- *Banco:* `PendingPlanId` **NULL**, `GatewayScheduleId` **NULL**, `PlanId` = profissional-anual.
  Proporcional cobrado.
- *Gateway:* o **schedule foi liberado** (`released`) antes do update — não pode restar schedule ativo.
- *UI:* o aviso de troca agendada some.

**Como falha:** se o schedule não for liberado antes, o Stripe **recusa** o update de itens de uma
assinatura governada por schedule → erro 500/gateway. É a armadilha do `ReleaseScheduleAsync`.

---

## P6 — Downgrade agendado + reescolher o plano atual (desistir)

**Pré:** P2 feito.

**Passos**
1. Trocar plano → escolha o plano **vigente** (Profissional Mensal).

**Esperado**
- *API:* `scheduled: false`, `effectiveAt: null`, `nextChargeAt: null`, `amountDueNowCents: 0`.
- *Banco:* `PendingPlanId` **NULL**, `GatewayScheduleId` NULL. `PlanId` inalterado.
- *Gateway:* schedule liberado. **Nada cobrado.**
- *UI:* o aviso de agendamento some; nada mais muda.

---

## P7 — Reescolher o plano atual **sem** agendamento

**Esperado:** **400** "Você já está neste plano". Nada tocado no gateway.

---

## P8 — Reescolher o plano **já agendado**

**Pré:** P2 feito (`PendingPlanId` = essencial-mensal).

**Passos**
1. Trocar plano → Essencial Mensal (o mesmo já agendado).

**Esperado:** **400** "A troca já está agendada". `PendingPlanId` e `GatewayScheduleId` intactos.

---

## P9 — Downgrade agendado, chega a renovação

É o **R2**. Confira lá: o plano é promovido **antes** de o período ser calculado, então o período novo
já sai com o ciclo do plano novo.

---

## P10 — Downgrade agendado, cancela antes da virada

**Pré:** P2 feito.

**Passos**
1. Assinatura → Cancelar.

**Esperado**
- *Banco:* `GatewayScheduleId` **NULL** e `PendingPlanId` **NULL** (o cancelamento limpa os dois);
  `Status` = `RefundRequested` ou `Canceled` conforme a janela (ver [05](05-cancelamento-reembolso.md)).
- *Gateway:* schedule liberado **e** assinatura cancelada. Nenhum schedule órfão pode sobrar.

> O cancelamento manda: o agendamento morre com a assinatura.

---

## P11 — Plano agendado some do catálogo

**Pré:** P2 feito (`PendingPlanId` = essencial-mensal).

**Passos**
1. Desative o plano agendado direto no banco:
   ```sql
   UPDATE Plans SET IsActive = 0 WHERE Slug = 'essencial-mensal';
   ```
2. Envie a renovação que consumiria o agendamento (como no R2, com o `PRICE_ID` do plano sumido).
3. Depois, reative: `UPDATE Plans SET IsActive = 1 WHERE Slug = 'essencial-mensal';`

**Esperado**
- *Banco:* **mantém o plano atual** (`PlanId` inalterado) — não vira NULL nem quebra.
  `PendingPlanId` é limpo quando o schedule se libera.
- *Log da API:* um `LogWarning` sobre o preço fora do catálogo.
- *HTTP:* 200 — um plano fora do catálogo **não** pode derrubar o processamento do webhook.

---

## P12 — Troca durante o trial

É o **T6**. Imediata, `TrialEndsAt` preservado, sem cobrança, gateway intocado.
