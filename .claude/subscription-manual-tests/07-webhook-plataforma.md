# Pipeline de webhook — garantias de plataforma (CG-10 a CG-18)

Referência: [subscriptions.md §9](../../docs/subscriptions.md). Estes cenários não são de produto — são
das **garantias do endpoint anônimo** `POST /api/webhooks/stripe`. São os que quebram calado: uma falha
aqui não aparece na UI, aparece em dinheiro perdido ou acesso indevido.

Todos usam `.claude/webhook-tests/send-stripe-webhook.ps1`.

---

## CG-10 — Assinatura inválida → 401 (antes de qualquer parse)

**Passos**
```powershell
# 1. Secret errado
.\send-stripe-webhook.ps1 .\fixtures\invoice-paid.json -Vars $ids -Secret 'whsec_errado'

# 2. Sem header (curl cru)
curl -X POST http://localhost:5000/api/webhooks/stripe -H "Content-Type: application/json" -d '{}'

# 3. Timestamp expirado (além do WebhookToleranceSeconds) — edite o $timestamp no script
#    para (agora - 1 hora) e envie.
```

**Esperado**
- **401** nos três. **Nada** persistido: nenhuma linha em `WebhookEvents`, nenhuma alteração de estado.
- A verificação acontece **antes do parse** — um corpo assinado com secret errado nunca chega a virar
  objeto.

**Por que importa:** o endpoint é anônimo. A assinatura é a **única** autenticação. Um 200 aqui
significa que qualquer um na internet pode ativar assinaturas de graça.

---

## CG-11 — Idempotência por `evt_...` → 200 sem reprocessar

É o **R7**. Mesmo `EVENT_ID` duas vezes → 200 nas duas, **uma** linha em `WebhookEvents`, efeito
aplicado **uma** vez.

```sql
SELECT EventId, COUNT(*) FROM WebhookEvents GROUP BY EventId HAVING COUNT(*) > 1;  -- deve vir vazio
```

> O `{provider}` da rota é **cosmético** — a idempotência usa `processor.Provider`. Enviar o mesmo
> evento para `/api/webhooks/qualquercoisa` deve ser deduplicado igual.

---

## CG-12 — Estado e evento no **mesmo** commit (atomicidade)

**Passos**
1. Pare o MySQL no meio do processamento:
   ```powershell
   docker compose stop db
   .\send-stripe-webhook.ps1 .\fixtures\invoice-paid.json -Vars $ids
   docker compose start db
   ```

**Esperado**
- *HTTP:* **500** — para o Stripe **retentar** (CG-13).
- *Banco (após religar):* **nem** o `Payment` **nem** o `WebhookEvent` existem. Não pode haver estado
  meio-aplicado.
- *Reenvio:* mande o mesmo evento de novo com o banco de pé → processa normalmente e fica consistente.

**Como falha:** se o `WebhookEvent` ficou gravado mas o `Payment` não, a retentativa do Stripe seria
**deduplicada** e o pagamento **nunca** entraria no histórico — dinheiro entrou, registro não.

---

## CG-13 / CG-14 — Erro → 500 (retentável); payload malformado → 400

**Passos**
```powershell
# Malformado, porém ASSINADO: quebre o JSON de um fixture (remova uma chave) e envie.
```

**Esperado**
- Corpo assinado, mas ilegível → **400** (reenviar os mesmos bytes não adiantaria).
- Erro **transitório** (banco fora, gateway fora) → **500** (o Stripe retenta, e a retentativa cura).

A distinção é o ponto: 400 diz "não insista"; 500 diz "insista".

---

## CG-15 — Datas sempre do evento, nunca de `UtcNow`

É o **R8** (evento atrasado). Reforço aqui: envie um `invoice-paid.json` com `CREATED` no passado e
confira que `Payments.PeriodStart`/`PeriodEnd` vêm das **linhas da fatura**, não da assinatura nem de
agora.

```sql
SELECT PeriodStart, PeriodEnd, CreatedAt FROM Payments ORDER BY CreatedAt DESC LIMIT 1;
```

**Por que as linhas da fatura, e não `sub.CurrentPeriodEnd`:** o `invoice.paid` pode chegar **antes** do
`customer.subscription.updated` da renovação — ler a data da assinatura ali gravaria o período
**anterior** no histórico.

---

## CG-16 — Resolução da assinatura (do mais específico ao mais genérico)

A cadeia: `metadata.subscriptionId` → `client_reference_id` → `sub_` → `metadata.userId` → `cus_` →
(só na disputa) o `Payment` pelo `pi_`.

**Passos** — remova os campos do fixture, um a um, e confira que ainda resolve:

| Envie um `subscription-updated-renewed.json` | Deve resolver por |
|---|---|
| completo | `metadata.subscriptionId` |
| **sem** `metadata` | `sub_` (o `GatewaySubscriptionId` bate) |
| sem `metadata` e com `sub_` desconhecido, mas `cus_` correto | `cus_` |
| sem nada que identifique | **no-op** + `LogWarning` |

**Atalho realista:** `stripe trigger invoice.paid` pelo CLI — os eventos do CLI **não trazem a nossa
metadata**, então já exercitam o fallback por `sub_`/`cus_` naturalmente.

---

## CG-17 — `Payment` resolvido **estritamente** pelo `GatewayChargeId`

**Passos**
1. Envie um `charge-refunded.json` com um `PI_ID` que **não existe** no histórico.

**Esperado**
- **Não** marca uma linha qualquer como estornada. Não existe fallback por "pendente mais recente".
- Como não dá para saber qual cobrança foi revertida, o comportamento é **conservador**: revoga o
  acesso (`RevokesAccess`) e loga.

**Como falha:** marcar o "pendente mais recente" corromperia o histórico — numa renovação não existe
`Payment` pré-criado para casar.

---

## CG-18 — `invoice.paid` que não resolve assinatura → no-op **com `LogWarning`**

**Passos**
1. Envie um `invoice-paid.json` com `SUB_ID`/`CUS_ID`/metadata todos inexistentes.

**Esperado**
- *HTTP:* 200 (não é erro do Stripe; retentar não resolveria).
- *Banco:* nenhum `Payment` criado.
- *Log da API* (`docker compose logs -f api`): um **`LogWarning`** — entrou dinheiro que não foi
  registrado. Silêncio aqui é o pior desfecho: ninguém descobre.

```powershell
docker compose logs api --tail=50 | Select-String -Pattern "warn|Warning"
```

---

## Evento fora do contrato

```powershell
.\send-stripe-webhook.ps1 .\fixtures\unknown-event.json -Vars $ids
```

**Esperado:** **200**, tipo `Unknown`, no-op **registrado** em `WebhookEvents`. Um evento novo do Stripe
(ou um que assinamos por engano no Dashboard) não pode derrubar o endpoint nem virar retentativa
infinita.
