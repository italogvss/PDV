# Trial — T1 a T7

Referência: [subscriptions.md §8.1](../../docs/subscriptions.md). A invariante em jogo: **o trial é
PDV-side, 30 dias, sem cartão — o gateway nunca é acionado.** Em todos os cenários deste arquivo, o
Dashboard do Stripe deve permanecer **intocado**: sem `cus_`, sem `sub_`, sem fatura.

---

## T1 — Cria loja com `?plano=`, nunca usou trial

**Pré:** e-mail novo (`HasUsedTrial = 0`), nenhuma assinatura.

**Passos**
1. Abra `http://localhost:5173/cadastro?plano=profissional-mensal`.
2. Cadastre-se e conclua a criação da loja.

**Esperado**
- *UI:* entra no dashboard; a tela de assinatura mostra "Teste grátis" com os 30 dias restantes.
  Módulos e features do **Profissional** liberados (nenhum 402).
- *Banco:* `Status = Trialing`, `Provider = ''`, `IsRenewable = 0`, `PlanId` = profissional-mensal,
  `TrialEndsAt = CurrentPeriodEnd ≈ now + 30d`, **`StartedAt` NULL**, `GatewaySubscriptionId` NULL.
  `Users.HasUsedTrial = 1`. Nenhuma linha em `Payments`.
- *Gateway:* nenhum customer, nenhuma assinatura criada.

> `StartedAt` NULL é o ponto: a janela de reembolso só nasce com a assinatura **paga**.

---

## T2 — Cria uma 2ª loja, já usou trial

**Pré:** o usuário do T1, ainda em trial (ou já assinante).

**Passos**
1. Menu de lojas → criar nova loja (com ou sem `?plano=`).

**Esperado**
- *UI:* a nova loja abre com o mesmo estado de assinatura da primeira — **nenhum trial novo**.
- *Banco:* continua **uma única linha** em `Subscriptions` para o usuário (invariante 1: uma assinatura
  por usuário, cobre todas as lojas). O novo `Tenant` existe, mas não gerou assinatura.

---

## T3 — Cria loja sem `?plano=`

**Pré:** e-mail novo.

**Passos**
1. Cadastre-se por `http://localhost:5173/cadastro` (sem query string) e crie a loja.

**Esperado**
- *UI:* após o login, o usuário é levado a **`/planos`** (`resolvePostLoginPath`). Abrir um módulo pelo
  menu → **402** / toast de upgrade.
- *Banco:* **nenhuma** linha em `Subscriptions`. `HasUsedTrial = 0` (ele ainda pode ganhar o trial
  depois, escolhendo um plano pela landing). `Tenants.ScheduledDeletionAt = CreatedAt + 90d` (D2).

---

## T4 — Trial vence

**Pré:** usuário em `Trialing` (T1).

**Passos**
1. Force o vencimento e rode o job:
   ```sql
   UPDATE Subscriptions SET TrialEndsAt = UTC_TIMESTAMP() - INTERVAL 1 DAY,
                            CurrentPeriodEnd = UTC_TIMESTAMP() - INTERVAL 1 DAY
   WHERE Id = '<Subscription.Id>';
   ```
   ```powershell
   docker compose restart api   # o job roda na subida
   ```
2. Recarregue o app.

**Esperado**
- *UI:* `SubscriptionExpiredModal`; a tela de assinatura oferece escolher um plano. Abrir módulo → 402.
- *Banco:* `Status = Expired`. `Tenants.ScheduledDeletionAt = AccessLostAt + 90d`.
- *Gateway:* intocado.

> Mesmo sem o job, o acesso já teria caído: `IsEntitledAt` compara `TrialEndsAt` com agora (RF-10).
> O job existe para carimbar o `Status` e disparar a retenção.

---

## T5 — Cancela durante o trial

**Pré:** usuário em `Trialing`, dentro dos 30 dias.

**Passos**
1. Configurações → Assinatura → **Cancelar**. Confirme.

**Esperado**
- *UI:* o acesso cai **na hora** (módulos → 402). Nenhuma menção a estorno. O usuário **continua
  logado** e a loja continua aberta.
- *Banco:* `Status = Expired`, `TrialEndsAt = CurrentPeriodEnd = now`, `CanceledAt` preenchido.
  `HasUsedTrial` continua `1`. `Tenants.IsActive = 1` e `ScheduledDeletionAt = now + 90d`.
- *Gateway:* intocado — não havia o que cancelar nem o que estornar.

---

## T6 — Troca de plano durante o trial

**Pré:** usuário em `Trialing` no Essencial Mensal. Anote `TrialEndsAt`.

**Passos**
1. Assinatura → Trocar plano → **Profissional Mensal** → confirmar.

**Esperado**
- *UI:* o diálogo de confirmação **não** mostra valor a cobrar; a troca é imediata. As features Pro
  aparecem em seguida.
- *Banco:* `PlanId` = profissional-mensal. `TrialEndsAt` e `CurrentPeriodEnd` **idênticos aos de
  antes**. `Status` segue `Trialing`. Nenhuma linha em `Payments`.
- *Gateway:* intocado.
- *API:* `POST /change-plan` devolve `scheduled: false`, `effectiveAt: null`, `nextChargeAt: null`,
  `amountDueNowCents: 0`.

Repita **descendo** (Pro → Essencial): também é imediato — no trial não há ciclo pago para proteger.

---

## T7 — Tenta assinar durante o trial

**Pré:** usuário em `Trialing` **vigente**.

**Passos**
1. Assinatura → tente **Assinar / Escolher plano** (se a UI oferecer) ou chame direto:
   ```
   POST /api/subscriptions/checkout  { "planId": "<guid>", "successUrl": "...", "cancelUrl": "..." }
   ```

**Esperado**
- *UI/API:* **400** (`EnsureCanCheckout`), com mensagem informando que o teste está vigente.
- *Banco:* nada muda; `Status` segue `Trialing`.
- *Gateway:* nenhuma sessão de checkout criada.

> Contraste com C4: uma `Canceled` **ainda dentro do período** *pode* reassinar. O bloqueio aqui é
> específico do trial vigente e do `Active` entitled — evita cobrança dupla.
