# Testes manuais — Assinaturas (Stripe)

Roteiro de execução manual do módulo de assinaturas. Cobre **todos** os cenários da matriz de
[docs/subscriptions.md §12](../../docs/subscriptions.md) (T/C/R/P/X/D) mais as garantias de
plataforma do pipeline de webhook (CG).

| Arquivo | Cenários | Foco |
|---|---|---|
| [01-trial.md](01-trial.md) | T1–T7 | Trial de 30 dias, PDV-side, sem gateway |
| [02-checkout.md](02-checkout.md) | C1–C9 | Contratação, ativação por webhook, reativação |
| [03-renovacao-dunning.md](03-renovacao-dunning.md) | R1–R8 | Renovação, cobrança recusada, idempotência |
| [04-troca-plano.md](04-troca-plano.md) | P1–P12 | Upgrade proporcional e troca agendada |
| [05-cancelamento-reembolso.md](05-cancelamento-reembolso.md) | X1–X11 | Cancelamento, janela de 7 dias, estorno, chargeback |
| [06-retencao-acesso.md](06-retencao-acesso.md) | D1–D7 | Bloqueio 402, retenção de 90 dias, exclusão |
| [07-webhook-plataforma.md](07-webhook-plataforma.md) | CG-10–CG-18 | Assinatura, idempotência, atomicidade, resolução |
| [00-checklist.md](00-checklist.md) | — | Folha de conferência para marcar durante a execução |

Cada cenário traz **pré-condição → passos → esperado**, com o esperado dividido em *UI*, *banco* e
*gateway* — os três precisam bater. Um cenário só passa se os três baterem.

---

## 1. Ambiente

```powershell
# raiz do projeto
docker compose up -d          # MySQL 3307 · MinIO 9000 · API 5000 · frontend 5173
```

O `.env` precisa de `Stripe__ApiKey` (`sk_test_...`), `Stripe__WebhookSecret` (`whsec_...`) e os
4 `Stripe__Prices__<slug>`. Sem os preços, o `PlanSeeder` **desativa** os planos e nenhum teste de
cobrança roda. Gere-os com:

```powershell
$env:STRIPE_SECRET_KEY = 'sk_test_...'
.\.claude\stripe-bootstrap\bootstrap.ps1     # imprime as linhas Stripe__Prices__... para o .env
```

> ⚠️ `env_file` do compose é lido na **criação** do container. Mudou o `.env`? `docker compose up -d api`
> (recriar), não `restart`.

### Encaminhamento de webhook

Em outro terminal, e **deixe rodando durante todos os testes**:

```powershell
stripe listen --forward-to localhost:5000/api/webhooks/stripe
# imprime um whsec_ efêmero → cole em Stripe__WebhookSecret no .env e recrie a API
```

Sem isso, **nada ativa**: a ativação vem por webhook, nunca da resposta do checkout (RF-17).

### Cartões de teste

| Cartão | Comportamento | Usado em |
|---|---|---|
| `4242 4242 4242 4242` | aprova sempre | C1, P*, X* |
| `4000 0000 0000 0002` | recusado no checkout | C7 |
| `4000 0000 0000 0341` | anexa, mas **falha na cobrança seguinte** | R3–R6 (dunning) |
| `4000 0000 0000 0259` | aprova e depois gera **disputa** | X7 |

Data futura qualquer, CVC qualquer, CEP qualquer.

---

## 2. Ferramentas de verificação

### Banco (fonte da verdade local)

```powershell
docker exec -it pdv-db mysql -uroot -p"$env:DB_ROOT_PASSWORD" pdv-ultra
```

Consulta padrão — **use esta a cada verificação** (troque o e-mail):

```sql
SELECT s.Id, p.Slug AS PlanoAtual, pp.Slug AS PlanoPendente, s.Status, s.StartedAt,
       s.TrialEndsAt, s.CurrentPeriodEnd, s.CanceledAt, s.GatewaySubscriptionId,
       s.GatewayScheduleId, s.GatewaySyncedAt, u.HasUsedTrial
FROM Subscriptions s
JOIN Users u   ON u.Id = s.UserId
LEFT JOIN Plans p  ON p.Id = s.PlanId
LEFT JOIN Plans pp ON pp.Id = s.PendingPlanId
WHERE u.Email = 'teste@exemplo.com';
```

Histórico de cobranças:

```sql
SELECT pay.Status, pay.AmountCents, pay.RetryNumber, pay.GatewayChargeId, pay.GatewayInvoiceId,
       pay.PeriodStart, pay.PeriodEnd, pay.CreatedAt
FROM Payments pay JOIN Users u ON u.Id = pay.UserId
WHERE u.Email = 'teste@exemplo.com' ORDER BY pay.CreatedAt DESC;
```

Eventos de webhook processados (idempotência) e retenção:

```sql
SELECT EventId, EventType, CreatedAt FROM WebhookEvents ORDER BY CreatedAt DESC LIMIT 10;
SELECT Name, IsActive, CreatedAt, ScheduledDeletionAt FROM Tenants WHERE Name = 'Loja Teste';
```

### Gateway

Dashboard do Stripe em **modo teste** → Customers / Subscriptions / Invoices / Schedules.
Confira sempre que o esperado mencionar *gateway* — o ponto de vários cenários (C3, P5) é
justamente que o estado remoto não fique órfão.

### Webhooks forjados

`.claude/webhook-tests/send-stripe-webhook.ps1` assina um fixture com o `whsec_` e o POSTa. É o único
jeito prático de dirigir **evento atrasado (R8)**, **duplicado (R7)** e **datas no passado**. Ver o
[README de lá](../webhook-tests/README.md).

---

## 3. Convenções deste roteiro

- **Usuário limpo** = e-mail novo (nunca usado). Vários cenários dependem de `User.HasUsedTrial = false`,
  que é **irreversível** pela aplicação — para reusar um e-mail, zere na mão:
  ```sql
  UPDATE Users SET HasUsedTrial = 0 WHERE Email = 'teste@exemplo.com';
  ```
- **Forçar o job** (`SubscriptionExpiryBackgroundService`, de hora em hora): em vez de esperar, recue a
  data no banco e reinicie a API (`docker compose restart api`) — o job roda na subida.
- **"Acesso bloqueado"** significa: qualquer endpoint gateado (ex.: `GET /api/products`) responde
  **402** com `code: NOT_IN_PLAN`. O frontend **não esconde a UI** — o 402 vira toast de upgrade.
  Para conferir sem devtools, abra um módulo pelo menu e observe o toast.
- Datas são sempre **UTC** no banco.
