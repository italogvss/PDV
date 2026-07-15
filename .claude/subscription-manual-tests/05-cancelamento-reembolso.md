# Cancelamento, reembolso e chargeback — X1 a X11

Referência: [subscriptions.md §8.7–8.8](../../docs/subscriptions.md). Invariantes: **7 dias de
arrependimento contados de `StartedAt`** (não da renovação); **cancelar nunca desativa a loja nem
desloga o usuário** (RF-40); o estorno é **assíncrono** — a assinatura fica em `RefundRequested` até o
webhook confirmar.

Os três desfechos do cancelamento:

| Situação | Estado final | Acesso | Dinheiro |
|---|---|---|---|
| Em trial | `Expired` | cai na hora | não houve cobrança |
| Pago, `now ≤ StartedAt + 7d` | `RefundRequested` | cai na hora | **estorno emitido** |
| Pago, fora da janela | `Canceled` | até o fim do período | nada a devolver |

Para simular o tempo, mova o **`StartedAt`** (a âncora), não o relógio:
```sql
UPDATE Subscriptions SET StartedAt = UTC_TIMESTAMP() - INTERVAL 40 DAY WHERE Id = '<id>';
```

---

## X1 — Cancela no dia 3 (dentro da janela)

**Pré:** `Active` paga há ≤ 7 dias (o C1 recém-feito já serve).

**Passos**
1. Assinatura → Cancelar. **Leia o diálogo** — ele deve avisar que o acesso cai **agora** e que o valor
   será estornado.
2. Confirme.

**Esperado**
- *API (`cancel`):* `{ status: "RefundRequested", refundRequested: true, accessUntil: <agora>,
  dataAvailableUntil: <agora + 90d> }`.
- *Banco:* `Status = RefundRequested`, `CurrentPeriodEnd = now`, `CanceledAt` preenchido,
  `GatewayScheduleId`/`PendingPlanId` NULL.
- *UI:* acesso cai **na hora** (módulos → 402). O usuário **continua logado**; a loja continua ativa.
- *Gateway:* a assinatura está **cancelada** e há um **refund** emitido sobre o `pi_` da cobrança.

**Ordem importa:** o gateway é cancelado **antes** da persistência local (RF-38) — mesmo que o banco
falhe, a próxima fatura não é cobrada.

---

## X2 — O estorno se consuma

**Pré:** X1 feito; o `charge.refunded` chega (pelo `stripe listen` ou pelo fixture).

```powershell
.\send-stripe-webhook.ps1 .\fixtures\charge-refunded.json -Vars $ids   # PI_ID = o da cobrança paga
```

**Esperado**
- *Banco:* a linha de `Payments` vira `Status = Refunded`. A `Subscription` vira **`Expired`**, com
  `CurrentPeriodEnd = event.created`.
- *UI:* a tela de assinatura mostra o estorno concluído; o histórico mostra "Estornado".
- *Retenção:* `ScheduledDeletionAt = now + 90d`.

---

## X3 — Cancela no dia 40 (mensal, fora da janela)

**Pré:** `Active` mensal. Force: `StartedAt = now - 40 DAY`, `CurrentPeriodEnd` no futuro (ex.: +20d).

**Passos**
1. Cancelar. O diálogo deve dizer que o acesso vale **até o fim do período**, sem estorno.

**Esperado**
- *API:* `{ status: "Canceled", refundRequested: false, accessUntil: <CurrentPeriodEnd> }`.
- *Banco:* `Status = Canceled`, **`CurrentPeriodEnd` PRESERVADO** (não vira `now`).
- *UI:* módulos **continuam funcionando** até a data. Um aviso mostra até quando.
- *Gateway:* assinatura cancelada (sem nova fatura). **Nenhum refund.**
- *Depois (job):* passado o `CurrentPeriodEnd` → `Expired`; retenção conta do **fim do período** (D4).

---

## X4 — Anual cancelada no dia 200

**Pré:** `Active` anual, `StartedAt = now - 200 DAY`, `CurrentPeriodEnd = StartedAt + 365d`.

**Esperado:** `Canceled` com acesso pelos **~165 dias restantes**. Mesma lógica do X3 — a janela de 7
dias não tem nada a ver com a duração do ciclo.

---

## X5 — Renova e cancela 2 dias depois (**fora** da janela)

**Pré:** C1 → R1 (renovação aplicada). `StartedAt` é o original; a renovação **não** o moveu.

**Passos**
1. Ajuste para simular: `StartedAt = now - 32 DAY` (assinou há 32 dias), `CurrentPeriodEnd` no futuro
   (renovou há 2 dias).
2. Cancelar.

**Esperado:** **`Canceled`**, sem estorno, acesso até o fim do período.

**Como falha:** se der `RefundRequested`, a renovação moveu o `StartedAt` — cada renovação estaria
reabrindo o direito ao reembolso.

---

## X6 — Reativa e cancela 2 dias depois (**dentro** da janela)

**Pré:** C3 feito (uma `Expired` reassinou). O checkout **zerou** `StartedAt` e o webhook regravou.

**Passos**
1. `StartedAt = now - 2 DAY`.
2. Cancelar.

**Esperado:** **`RefundRequested`** + estorno emitido. A reativação **reabre** a janela — é a diferença
proposital em relação ao X5.

---

## X7 — Chargeback no período corrente

**Pré:** `Active` com uma cobrança `Paid` cujo `PeriodEnd` está **no futuro**.

**Passos**
```powershell
.\send-stripe-webhook.ps1 .\fixtures\charge-dispute-created.json -Vars $ids
```
(ou, ponta a ponta: assine com `4000 0000 0000 0259` e espere a disputa.)

**Esperado**
- *Banco:* `Payments` → `Status = Disputed`. `Subscription` → **`Expired`**,
  `CurrentPeriodEnd = event.created`.
- *UI:* acesso bloqueado; retenção de 90d começa.

> Disputa = reversão **total** → sempre revoga. Não há disputa parcial no nosso modelo.

---

## X8 — Estorno de fatura **antiga**, assinante **ativo**

**Pré:** uma assinatura `Active` com **duas** cobranças `Paid`: uma antiga (`PeriodEnd` no **passado**)
e a corrente (`PeriodEnd` no futuro).

**Passos**
1. Envie o `charge-refunded.json` apontando para o `PI_ID` da cobrança **antiga**.

**Esperado**
- *Banco:* a linha **antiga** vira `Refunded`. A `Subscription` **continua `Active`** e
  `CurrentPeriodEnd` **não** muda.
- *UI:* nada muda; o acesso segue.

**Como falha:** se a assinatura for derrubada, o `RevokesAccess` está ignorando o período que a
cobrança custeia — um estorno de cortesia de meses atrás cortaria o acesso de um cliente pagante.

**Variante (estorno parcial):** um `charge.refunded` com valor **menor** que o total também **não**
derruba nada. Só a reversão integral revoga.

---

## X9 — Eco do cancelamento em `RefundRequested`

**Pré:** X1 feito, assinatura em `RefundRequested`, estorno **ainda não** confirmado.

**Passos**
```powershell
.\send-stripe-webhook.ps1 .\fixtures\subscription-deleted.json -Vars $ids
```
(É o eco do cancelamento que **nós mesmos** pedimos no gateway.)

**Esperado**
- *Banco:* **no-op** — o `Status` **continua `RefundRequested`**, não vira `Canceled`.
- *HTTP:* 200.

**Como falha:** virar `Canceled` faria a assinatura parecer "acesso até o fim do período" quando o
dinheiro está sendo devolvido. O estado espera o `charge.refunded` (X2) para virar `Expired`.

---

## X10 — Eco do cancelamento por falta de pagamento

É o **R6**. `cancellation_details.reason = payment_failed` → `Expired`, período **agora**, sem cortesia
(contraste com o cancelamento voluntário do X3, que preserva o período).

---

## X11 — Cancela e tenta reassinar antes do estorno

É o **C6**. Bloqueado com 400 enquanto o `RefundRequested` não se resolve.

**Por quê:** se a reassinatura passasse, o `charge.refunded` (que ainda está por vir) derrubaria a
assinatura **nova** — o usuário pagaria e seria deslogado do plano.
