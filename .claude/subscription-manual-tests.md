# Plano de Testes Manuais — Módulo de Assinaturas

> Derivado de `docs/subscriptions.md` (revalidado em 2026-07-08) e `docs/abacatepay.md`, conferido
> contra o código em 2026-07-09. Cobre os cenários da §7 e os requisitos RF-01…RF-13.
>
> **Escopo:** somente cartão (o PIX foi removido do billing). Trial é PDV-side (30 dias, sem gateway).
>
> Os eventos de webhook **não dependem do gateway real**: a chave HMAC do AbacatePay é pública e fixa,
> então dá para forjar eventos válidos localmente. Ver §3 e `.claude/webhook-tests/`.

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Instrumentação: como observar o estado](#2-instrumentação-como-observar-o-estado)
3. [Ferramenta de webhook mock](#3-ferramenta-de-webhook-mock)
4. [Suíte T — Trial PDV-side](#4-suíte-t--trial-pdv-side)
5. [Suíte C — Checkout](#5-suíte-c--checkout)
6. [Suíte W — Webhook: segurança e pipeline](#6-suíte-w--webhook-segurança-e-pipeline)
7. [Suíte E — Webhook: eventos de ciclo de vida](#7-suíte-e--webhook-eventos-de-ciclo-de-vida)
8. [Suíte P — Troca de plano](#8-suíte-p--troca-de-plano)
9. [Suíte X — Cancelamento](#9-suíte-x--cancelamento)
10. [Suíte R — Reativação](#10-suíte-r--reativação)
11. [Suíte J — Job de expiração](#11-suíte-j--job-de-expiração)
12. [Suíte G — Enforcement 402 e limites](#12-suíte-g--enforcement-402-e-limites)
13. [Suíte H — Histórico de cobranças](#13-suíte-h--histórico-de-cobranças)
14. [Suíte M — Multi-loja e Employee](#14-suíte-m--multi-loja-e-employee)
15. [Suíte S — Seed e catálogo](#15-suíte-s--seed-e-catálogo)
16. [Suíte U — Regressões de UI e bugs abertos](#16-suíte-u--regressões-de-ui-e-bugs-abertos)
17. [Hipóteses de bug levantadas na leitura do código](#17-hipóteses-de-bug-levantadas-na-leitura-do-código)
18. [Matriz de rastreabilidade RF → teste](#18-matriz-de-rastreabilidade-rf--teste)
19. [Registro de execução](#19-registro-de-execução)

---

## 1. Pré-requisitos

### 1.1 Ambiente

```bash
docker compose up          # db (3307), minio (9000/9001), api (5000), frontend (5173)
```

Landing (trial via `?plano=`) roda separada em `http://localhost:5174`.

### 1.2 Variáveis de ambiente — checar antes de tudo

| Variável | Valor esperado | Por quê |
|---|---|---|
| `AbacatePay__WebhookSecret` | qualquer string forte | **Ausente do `.env.example`.** `VerifySecret` retorna `false` quando o secret configurado é vazio → **todo webhook responde 401**, inclusive os válidos. |
| `AbacatePay__BaseUrl` | `https://api.abacatepay.com/v2` | O `.env.example` traz `/v1`, mas o `AbacatePayApiClient` chama caminhos v2 (`customers/create`, `subscriptions/create`, `checkouts/get`). Com `/v1` o checkout quebra com 404 do gateway. |
| `AbacatePay__ApiKey` | chave de **devMode** | Necessária só para as suítes C/P/X (que tocam o gateway). As suítes W/E rodam sem gateway. |
| `VITE_LANDING_URL` | `http://localhost:5174` | Destino do redirect após cancelar em trial. |

> **PRE-01** — Suba a API e confirme no log que `PlanSeeder` rodou e que os 4 planos existem
> (`SELECT Name, Slug, PriceCents, BillingPeriod FROM Plans;`). Sem isso nenhuma suíte passa.

### 1.3 Contas de teste

Crie usuários **distintos** por suíte — `User.HasUsedTrial` é irreversível e uma vez marcado
inviabiliza os testes de trial daquela conta. Sugestão: `qa-trial@…`, `qa-checkout@…`, `qa-webhook@…`.

---

## 2. Instrumentação: como observar o estado

### 2.1 Atalho de SQL

```bash
# alias mental: <sql> = docker compose exec -T db mysql -uroot -p"$DB_ROOT_PASSWORD" pdv-ultra -e
docker compose exec -T db mysql -uroot -padmin pdv-ultra -e "SELECT 1"
```

### 2.2 Consultas de verificação

Enums são persistidos como **string** (`HasConversion<string>`), então os valores são legíveis.

```sql
-- Assinatura do usuário (uma por User — índice único em UserId)
SELECT s.Id, u.Email, p.Name AS Plano, s.Status, s.Method, s.IsRenewable, s.Provider,
       s.GatewaySubscriptionId, s.GatewayCustomerId,
       s.TrialEndsAt, s.CurrentPeriodEnd, s.CanceledAt, s.IsActive
FROM Subscriptions s
JOIN Users u ON u.Id = s.UserId
JOIN Plans p ON p.Id = s.PlanId
WHERE u.Email = 'qa-webhook@exemplo.com';

-- Histórico de cobranças
SELECT GatewayChargeId, Kind, Method, AmountCents, Status, PaidAt,
       CardBrand, CardLastFour, PeriodStart, PeriodEnd, CouponCode
FROM Payments WHERE UserId = '<USER_ID>' ORDER BY CreatedAt;

-- Eventos de webhook processados (idempotência)
SELECT Provider, EventType, EventId, Status, ProcessedAt
FROM WebhookEvents ORDER BY ProcessedAt DESC LIMIT 20;

-- Cliente no gateway
SELECT GatewayCustomerId, Email, TaxId, Cellphone FROM GatewayCustomers WHERE UserId = '<USER_ID>';

-- Trial já usado?
SELECT Email, HasUsedTrial, Document, Phone FROM Users WHERE Email = 'qa-trial@exemplo.com';
```

### 2.3 Como coletar os IDs para os payloads

| Token do payload | Onde obter |
|---|---|
| `{{SUBSCRIPTION_ID}}` | `Subscriptions.Id` (GUID local) — é o `externalId` enviado ao gateway |
| `{{USER_ID}}` | `Subscriptions.UserId` |
| `{{PLAN_ID}}` | `Subscriptions.PlanId` |
| `{{BILL_ID}}` | `Payments.GatewayChargeId` do `Payment` Pending criado no checkout |
| `{{CUSTOMER_ID}}` | `GatewayCustomers.GatewayCustomerId` (`cust_…`) |
| `{{PRODUCT_ID}}` | `Plans.ExternalProductId` do plano atual |
| `{{NEW_PRODUCT_ID}}` | `Plans.ExternalProductId` do plano-alvo (troca) |
| `{{SUBS_ID}}` | inventado por você (`subs_qa0001`) — é o gateway que o define; o webhook o grava |
| `{{LOG_ID}}` | inventado (`log_qa0001`) — vira o `EventId` dos `subscription.*` |
| `{{RENEW_BILL_ID}}`, `{{CHANGE_BILL_ID}}` | inventados (`bill_qa_renew01`) — simulam novas cobranças |

### 2.4 Forçar estados sem esperar

```sql
-- Trial vencido (para a suíte J)
UPDATE Subscriptions SET TrialEndsAt = UTC_TIMESTAMP() - INTERVAL 1 DAY,
                         CurrentPeriodEnd = UTC_TIMESTAMP() - INTERVAL 1 DAY
WHERE Id = '<SUBSCRIPTION_ID>';

-- Assinatura ativa com período vencido (falha de renovação — RF-05.4)
UPDATE Subscriptions SET Status = 'Active', CurrentPeriodEnd = UTC_TIMESTAMP() - INTERVAL 1 DAY
WHERE Id = '<SUBSCRIPTION_ID>';

-- Cancelada dentro do período pago (reativação — R-02)
UPDATE Subscriptions SET Status = 'Canceled', CanceledAt = UTC_TIMESTAMP(),
                         CurrentPeriodEnd = UTC_TIMESTAMP() + INTERVAL 10 DAY
WHERE Id = '<SUBSCRIPTION_ID>';
```

O `SubscriptionExpiryBackgroundService` roda **uma vez no startup** e depois a cada 1h.
Para disparar a varredura sem esperar: `docker compose restart api`.

---

## 3. Ferramenta de webhook mock

A chave HMAC do AbacatePay é **pública e fixa** (`AbacatePayWebhookProcessor.AbacatePayHmacKey`),
igual para todos os merchants. Logo, é possível assinar corpos localmente e exercitar o pipeline
inteiro — validação, idempotência, resolução de assinatura/pagamento e aplicação de estado — sem o
gateway.

```
.claude/webhook-tests/
├── send-webhook.ps1                 ← assina (HMAC-SHA256) e envia
└── payloads/
    ├── checkout-completed-paid.json
    ├── checkout-completed-pending-trial.json
    ├── checkout-completed-renewal.json      ← sem externalId/metadata (resolve por cust_)
    ├── checkout-refunded.json
    ├── checkout-disputed.json
    ├── subscription-completed.json
    ├── subscription-renewed.json
    ├── subscription-plan-changed.json
    ├── subscription-cancelled.json
    ├── subscription-trial-started.json      ← fluxo inativo (planos sem trialDays)
    └── unknown-event.json
```

### 3.1 Uso

```powershell
cd .claude\webhook-tests
$env:ABACATE_WEBHOOK_SECRET = '<AbacatePay__WebhookSecret do .env>'

.\send-webhook.ps1 .\payloads\checkout-completed-paid.json -Vars @{
    SUBSCRIPTION_ID = '0a50d090-2eca-4963-8e92-ca32194579d5'
    BILL_ID         = 'bill_qa0001'
    CUSTOMER_ID     = 'cust_qa0001'
    USER_ID         = '3f2b1d0e-...'
    PLAN_ID         = '9c1e77aa-...'
    PRODUCT_ID      = 'prod_LzwznAgbxBqQkHJ4ZNhRq5uX'
}
```

Flags para os testes negativos:

| Flag | Efeito |
|---|---|
| `-NoSecret` | Não envia `?webhookSecret=` → espera **401** |
| `-BadSignature` | Header presente, assinatura incorreta → espera **403** |
| `-NoSignature` | Omite `X-Webhook-Signature` → espera **403** |
| `-TamperAfterSign` | Assina o corpo, envia outro → espera **403** |
| `-MutateBody` | Anexa espaços **antes** de assinar: assinatura válida, `EventId` (hash) diferente |
| `-DryRun` | Imprime corpo/assinatura/`EventId` sem enviar |

### 3.2 Regras que o script respeita (e que você quebra se usar curl à toa)

- **Os bytes assinados são os bytes enviados.** O backend lê o corpo raw com `EnableBuffering` e
  recalcula o HMAC sobre ele. Reserializar o JSON (mudar espaços, ordem, aspas) invalida a assinatura.
- **BOM quebra o HMAC.** O `StreamReader` do backend remove o BOM antes de recomputar; o script
  usa `File.ReadAllText` (que também remove) para casar os bytes.
- **`EventId` dos `checkout.*` é `HEX(SHA256(corpo))`.** O script imprime esse hash — use-o para
  conferir a linha em `WebhookEvents`. Já os `subscription.*` usam o campo `id` (`log_…`) do payload.
- **`createdAt`/`updatedAt` do checkout são obrigatórios na prática.** São `DateTime` não-anulável no
  `WebhookCheckout`; se omitidos viram `0001-01-01`, fora do range do MySQL → `SaveChanges` explode.
  (Isso é usado de propósito no teste **W-12**.)

---

## 4. Suíte T — Trial PDV-side

> RF-01. Pré-condição geral: usuário novo, `HasUsedTrial = 0`, sem assinatura.

### T-01 — Trial concedido no onboarding com slug válido
1. Landing → `http://localhost:5174/?plano=essencial-mensal` → cadastro → criar loja.
2. **Esperado:** `Subscriptions` com `Status='Trialing'`, `Provider=''` (vazio), `IsRenewable=0`,
   `TrialEndsAt = CurrentPeriodEnd ≈ now + 30d`, `GatewaySubscriptionId` nulo.
3. `Users.HasUsedTrial = 1`. **Nenhuma linha em `Payments` nem em `GatewayCustomers`.**
4. `GET /api/subscriptions/me` → `status: "Trialing"`, `isRenewable: false`, `hasUsedTrial: true`.

### T-02 — Onboarding sem slug → sem trial
1. Cadastre direto em `http://localhost:5173` (sem `?plano=`).
2. **Esperado:** nenhuma `Subscription`. `/me` → `status: "None"`, `planId: null`, `entitlements: []`.
3. Qualquer módulo gateado (ex.: `GET /api/products`) → **402 `NOT_IN_PLAN`**.

### T-03 — Slug desconhecido não derruba o onboarding *(RF-01.5)*
1. `?plano=plano-que-nao-existe` → cadastro completo.
2. **Esperado:** loja criada com sucesso, **sem** trial, `HasUsedTrial` continua `0`.

### T-04 — Trial é único por usuário *(RF-01.6)*
1. Usuário de T-01 cria uma **segunda loja** entrando de novo por `?plano=profissional-mensal`.
2. **Esperado:** nenhum trial novo (`HasUsedTrial=1` já bloqueia). A assinatura existente continua a mesma.

### T-05 — Trial Essencial concede módulos, não concede features
1. Trial de `essencial-mensal` ativo.
2. `GET /api/products`, `/api/sales`, `/api/customers` → **200**.
3. `GET /api/reports/...` (`[RequireEntitlement(AdvancedReports)]`) → **402 `NOT_IN_PLAN`**.
4. `GET /api/notifications` (`[RequireEntitlement(Notifications)]`) → **402**.
5. `POST /api/team-roles` (`CustomRoles`) → **402**.

### T-06 — Trial Profissional concede tudo
1. Trial de `profissional-mensal`.
2. Os mesmos endpoints de T-05 → **200**. `/me` → `entitlements` com 10 módulos + 13 features.

### T-07 — Trial expirado bloqueia *(RF-01.3)*
1. Force `TrialEndsAt` no passado (§2.4) → `docker compose restart api`.
2. **Esperado:** `Status='Expired'` (job), `/me` → `entitlements: []`, módulos → **402**.
3. UI (Configurações → Assinatura): chip "EXPIRADO" + card de reassinatura.

### T-08 — Não há conversão trial → pago *(RF-01.4, lacuna #12)*
1. Com trial vigente, `POST /api/subscriptions/checkout { planId }`.
2. **Esperado hoje:** **400** — `"Sua assinatura está ativa até dd/MM/yyyy. Aguarde o fim desse período…"`.
3. Registre como **lacuna conhecida**, não como bug novo.

### T-09 — Upgrade durante o trial troca só o plano local *(RF-04.2)*
1. Trial `essencial-mensal` → UI "Fazer upgrade agora" (ou `POST /change-plan { planId: <pro-mensal> }`).
2. **Esperado:** `PlanId` muda; `TrialEndsAt` e `CurrentPeriodEnd` **inalterados**;
   `GatewaySubscriptionId` continua nulo; **nenhum `Payment` criado**; nenhuma chamada ao gateway
   (confirme no log da API que não houve `POST subscriptions/change-plan`).
3. `/me` → `entitlements` agora inclui as features do Pro.

### T-10 — Cancelar em trial revoga acesso e agenda exclusão *(RF-06.2)*
1. Trial vigente, com ao menos 2 lojas do mesmo Owner. `POST /api/subscriptions/cancel`.
2. **Esperado:** resposta `{ accessRevoked: true }`.
3. `Subscriptions` e `Payments` da sub **fisicamente removidos** (hard delete).
4. **Todas** as lojas do Owner: `IsActive=0`, `ScheduledDeletionAt` preenchido.
   ⚠️ O código usa `AddMonths(1)`; a doc diz "30 dias". Confirme o valor gravado.
5. `Users.HasUsedTrial` continua `1`.
6. Frontend: `logout()` + redirect para `VITE_LANDING_URL`.

---

## 5. Suíte C — Checkout

> RF-02. Requer `AbacatePay__ApiKey` de devMode.

### C-01 — Employee não inicia checkout
`POST /checkout` autenticado como `Employee` → **403** (`[Authorize(Roles="Owner,Admin")]`).

### C-02 — Plano inexistente
`POST /checkout { planId: "<guid aleatório>" }` → **404 "Plano não encontrado."**

### C-03 — Plano existe local mas não no gateway
1. `UPDATE Plans SET ExternalProductId='prod_naoexiste' WHERE Slug='essencial-mensal';`
2. `POST /checkout` → **404** (`CheckIfPlanExistsAsync` falhou). Reverta o UPDATE depois.

### C-04 — Checkout feliz
1. Usuário sem assinatura viva (ou `Expired`). `POST /checkout { planId }`.
2. **Esperado:** resposta `{ checkoutUrl }` (apenas isso — sem campo `pix`).
3. `Subscriptions`: `Status='Pending'`, `Method='Card'`, `IsRenewable=1`, `Provider='AbacatePay'`,
   `GatewayCustomerId='cust_…'`, `CanceledAt=NULL`.
4. `Payments`: 1 linha `Status='Pending'`, `Kind='CardSubscription'`, `GatewayChargeId='bill_…'`,
   `AmountCents = Plans.PriceCents`.
5. `GatewayCustomers`: 1 linha. Se o `User` tinha `Document`/`Phone` vazios e o gateway devolveu,
   foram sincronizados.
6. **A assinatura NÃO fica ativa** — a ativação vem do webhook.

### C-05 — Checkout bloqueado com assinatura ativa *(RF-02.2)*
Sub `Active` com `CurrentPeriodEnd` no futuro → `POST /checkout` → **400 "Sua assinatura está ativa até …"**.

### C-06 — Reativação reaproveita a mesma linha *(RF-02.3)*
1. Sub `Canceled` (§2.4). Anote `Subscriptions.Id`.
2. `POST /checkout` → **200**.
3. **Esperado:** **mesmo `Id`** (índice único em `UserId`), `Status='Pending'`, `CanceledAt=NULL`,
   novo `Payment` Pending com novo `bill_`. O `Payment` antigo permanece no histórico.

### C-07 — Reativação de assinatura expirada
Sub `Expired` → `POST /checkout` → **200**, mesma linha reaproveitada.

### C-08 — Checkout abandonado *(RF-02.7, 🟠)*
1. `POST /checkout`, **não** pague, não envie webhook.
2. **Esperado:** sub fica `Pending` indefinidamente; `IsEntitled=false` → módulos em **402**;
   `Payment` fica `Pending` para sempre. **Não há TTL nem limpeza.** Registrar como lacuna.
3. Um novo `POST /checkout` é permitido (Pending não bloqueia) e cria **outro** `Payment` Pending.
   Verifique quantos `Payment` Pending órfãos sobram.

### C-09 — Tela de retorno *(RF-02.6)*
1. Após C-04, acesse `/assinatura/retorno` manualmente.
2. Enquanto a sub está `Pending`, a página faz polling de `/me` a cada 3s.
3. Envie `subscription.completed` (E-02) durante o polling → a página deve destravar sozinha.
4. Não envie nada → após **60s** aparece o estado de timeout com botão "Verificar novamente".

### C-10 — Cupom inválido
`POST /checkout { planId, couponCode: "NAOEXISTE" }` → erro do gateway (`PaymentGatewayException`).
Verifique que **nada** foi persistido (a sub não deve ficar `Pending` com `Payment` órfão) —
o `CreateSubscriptionCheckoutAsync` roda **antes** do `PersistSubscriptionAsync`, então o esperado é
nenhuma escrita.

---

## 6. Suíte W — Webhook: segurança e pipeline

> RF-03. Não precisa de gateway. Rode a suíte inteira com uma sub `Pending` de C-04 (ou criada à mão).

| # | Ação | Esperado |
|---|---|---|
| **W-01** | `-NoSecret` | **401**. Nada em `WebhookEvents`. |
| **W-02** | `-Secret 'errado'` | **401**. |
| **W-03** | `-NoSignature` | **403**. |
| **W-04** | `-BadSignature` | **403**. |
| **W-05** | `-TamperAfterSign` | **403** — prova que o HMAC cobre o **corpo**, não só a presença do header. |

### W-06 — Corpo malformado
```powershell
'{"event":"checkout.completed",' | Set-Content -Encoding utf8 .\payloads\_broken.json
.\send-webhook.ps1 .\payloads\_broken.json
```
**Esperado hoje: 500.** `processor.Parse` roda **fora** do `try/catch` do controller, então a
`JsonException` sobe para o `ExceptionMiddleware`. Consequência: o gateway vai **retentar para sempre**
um payload que nunca vai funcionar. Ver §17 #4.

### W-07 — Evento desconhecido *(RF-03.7)*
`unknown-event.json` → **200**. `WebhookEvents` ganha 1 linha (`EventType='payout.completed'`,
`Status='Processed'`). Nenhum estado de assinatura muda.

### W-08 — Idempotência de `checkout.*` (mesmo corpo) *(RF-03.2)*
1. Envie `checkout-completed-paid.json` → 200. Anote o `EventId` impresso pelo script.
2. Envie **exatamente o mesmo comando** → 200.
3. **Esperado:** apenas **1** linha em `WebhookEvents` com esse `EventId`; `Payments` inalterado
   (nenhuma segunda cobrança); `PaidAt` não muda.

### W-09 — Idempotência de `subscription.*` (mesmo `log_`)
1. `subscription-completed.json` com `LOG_ID='log_qa0001'` → 200.
2. Reenvie com `LOG_ID='log_qa0001'` mas mude qualquer outro campo (ex.: `SUBS_ID`) → **200 sem reprocessar**.
3. **Esperado:** `GatewaySubscriptionId` **não** foi sobrescrito pelo segundo envio.

### W-10 — Fragilidade da idempotência por hash *(⚪ observação da doc)*
1. Envie `checkout-completed-paid.json` → 200.
2. Reenvie com `-MutateBody` (mesmo JSON, 3 espaços a mais).
3. **Esperado:** **novo `EventId`** → o evento é **reprocessado**. Porém `CompleteChargeAsync` é
   idempotente por `bill_` (`GetPaymentByGatewayChargeIdAsync`), então **não** deve nascer um segundo
   `Payment`. Confirme: 2 linhas em `WebhookEvents`, 1 linha em `Payments`.
4. Isto valida a rede de segurança. Se o AbacatePay reserializar o corpo nas retentativas, é este
   caminho que protege o histórico.

### W-11 — Evento que não resolve assinatura *(RF-03.7)*
`checkout-completed-paid.json` com `SUBSCRIPTION_ID` = GUID inexistente, `CUSTOMER_ID` = `cust_inexistente`,
`BILL_ID` = `bill_inexistente`, sem `metadata.subscriptionId` (remova o bloco).
**Esperado:** **200**, `WebhookEvents` gravado, **nenhuma** assinatura/pagamento alterado.

### W-12 — Atomicidade: falha no processamento não persiste nada *(RF-03.3)*
**Opção A (determinística):**
1. `docker compose stop db`
2. Envie `checkout-completed-paid.json` → **500**.
3. `docker compose start db`; confirme que **não** existe linha em `WebhookEvents` para aquele `EventId`.
4. Reenvie o mesmo corpo → agora processa normalmente (retentativa do gateway funcionaria).

**Opção B (via payload):** remova `createdAt`/`updatedAt` de `data.checkout` num evento `status: "PAID"`.
`PaidAt` vira `0001-01-01`, fora do range do MySQL → `SaveChanges` falha → **500** e nada persistido.
Se isso **não** der 500, investigue: significa que uma data inválida foi gravada.

### W-13 — Ordem de resolução da assinatura *(RF-03.5)*
Envie `checkout-completed-paid.json` variando os campos e confirme qual caminho resolve:

| Variante | Caminho esperado |
|---|---|
| `metadata.subscriptionId` correto, `externalId` **errado** | resolve por metadata (prioridade 1) |
| sem `metadata`, `externalId` = `Subscriptions.Id` | resolve por externalId (2) |
| sem metadata/externalId, sub já tem `GatewaySubscriptionId` e o payload traz `data.subscription.id` | resolve por `subs_` (3) |
| só `metadata.userId` | resolve por userId (4) |
| só `customer.id` = `cust_` cadastrado | resolve por customer (5) — é o caminho da **renovação** |

### W-14 — Resolução do `Payment` é estrita *(RF-03.6)*
1. Deixe um `Payment` Pending com `bill_A`.
2. Envie `checkout.completed` com `BILL_ID='bill_B'` (e `externalId` da mesma sub).
3. **Esperado:** o `Payment` `bill_A` **continua Pending**; nasce um novo `Payment` `bill_B` já `Paid`.
   Não há fallback por "pendente mais recente".

---

## 7. Suíte E — Webhook: eventos de ciclo de vida

> Sequência recomendada: E-01 → E-02 → E-03 → E-04. Cada teste assume o anterior.

### E-01 — `checkout.completed` (PAID) dá baixa, mas **não ativa** *(RF-03.4)*
Envie `checkout-completed-paid.json` sobre a sub `Pending` de C-04.

**Esperado:**
- `Payments`: `Status='Paid'`, `PaidAt` = `checkout.updatedAt`, `ReceiptUrl` preenchido,
  `CardBrand='visa'`, `CardLastFour='4242'`, `AmountCents=2999`.
- `PeriodStart = now`, e **`PeriodEnd = NULL`** — porque `sub.CurrentPeriodEnd` ainda é nulo
  (a sub só ganha período no `subscription.completed`). Ver §17 #2.
- `Subscriptions.Status` **continua `Pending`**. O acesso ainda está bloqueado (402).

### E-02 — `subscription.completed` ativa e define o período
Envie `subscription-completed.json` (`SUBS_ID='subs_qa0001'`, `LOG_ID='log_qa0001'`).

**Esperado:**
- `Status='Active'`, `GatewaySubscriptionId='subs_qa0001'`.
- `CurrentPeriodEnd ≈ now + 1 mês` (plano **mensal**).
- `/me` → `status: "Active"`, `entitlements` populados. Módulos → **200**.

### E-02b — Ciclo anual usa `AddYears(1)` *(RF-05.3)*
Repita E-01/E-02 com um usuário no plano **`essencial-anual`**.
**Esperado:** `CurrentPeriodEnd ≈ now + 1 ano`.
⚠️ Verifique também que `sub.Plan` foi carregado: `NextPeriodEnd` cai em `AddMonths(1)` se `Plan` vier
nulo. Os repositórios de webhook usam `Include(s => s.Plan)`, então o esperado é o ano correto.

### E-03 — Renovação: `subscription.renewed` + `checkout.completed` *(RF-05.1, RF-05.2)*
1. `subscription-renewed.json` (`LOG_ID='log_qa0002'`, `RENEW_BILL_ID='bill_qa_renew01'`).
   → `Status='Active'`, `CurrentPeriodEnd` empurrado +1 mês a partir de **agora**.
2. `checkout-completed-renewal.json` (mesmo `RENEW_BILL_ID`, **sem** `externalId` e **sem** `metadata`).
   → resolve por `customer.id`; nasce um **segundo** `Payment` já `Paid`,
   `PeriodEnd = CurrentPeriodEnd` novo.
3. **Esperado final:** 2 linhas em `Payments`, ambas `Paid`.

### E-04 — Renovação em ordem invertida *(sensibilidade de ordem)*
Refaça E-03 mandando o `checkout.completed` **antes** do `subscription.renewed`.
**Esperado:** o `Payment` novo nasce com `PeriodEnd` = período **antigo** (ainda não estendido).
Não é erro fatal, mas o histórico fica com o período errado. Registre o resultado — ver §17 #2.

### E-05 — `checkout.completed` PENDING (trial de gateway)
`checkout-completed-pending-trial.json` sobre uma sub com `Payment` Pending.
**Esperado:** só `CardBrand`/`CardLastFour` são gravados no `Payment` pendente.
`Status` do `Payment` continua `Pending`; a sub não muda.

### E-06 — `subscription.plan_changed` reconcilia o plano *(RF-04.3)*
1. Sub `Active` no Essencial Mensal, `CurrentPeriodEnd` anotado.
2. `subscription-plan-changed.json` com `NEW_PRODUCT_ID='prod_czbpxhGs1MgpuwqJpMkN6XGZ'` (Pro Mensal),
   `CHANGE_BILL_ID='bill_qa_change01'`, `checkout.status='PAID'`.
3. **Esperado:** `PlanId` = Pro Mensal; **`CurrentPeriodEnd` e `TrialEndsAt` inalterados**;
   novo `Payment` `Paid` de 4999 com `bill_qa_change01`.

### E-07 — `plan_changed` com `productId` desconhecido
Mesmo payload, `NEW_PRODUCT_ID='prod_naoexiste'`.
**Esperado:** **200**, `PlanId` **inalterado**, `GatewaySubscriptionId` capturado, `Payment` da troca criado.

### E-08 — `subscription.cancelled` *(RF-06.5)*
1. Sub `Active`. Envie `subscription-cancelled.json` com `BILL_ID` = **um `bill_` qualquer não usado**.
2. **Esperado:** `Status='Canceled'`, `CanceledAt` preenchido, `CurrentPeriodEnd` **preservado**
   (acesso continua até o fim do período — `IsEntitled` cobre `Canceled`).

### E-08b — ⚠️ `cancelled` com o `bill_` da cobrança paga
1. Sub `Active` cujo `Payment` `bill_qa0001` está **`Paid`**.
2. Envie `subscription-cancelled.json` com `BILL_ID='bill_qa0001'` (é o que o gateway manda —
   o payload real de `subscription.cancelled` traz o checkout original).
3. **Observe:** `ApplyCancelled` faz `payment.Status = Cancelled` **sem checar se já estava `Paid`**.
   Se o `Payment` virar `Cancelled`, é **bug**: uma cobrança efetivamente paga sai do histórico como
   cancelada. Ver §17 #1.

### E-09 — `cancelled` idempotente com o cancel manual
1. `POST /api/subscriptions/cancel` (sub `Active`) → `CanceledAt = T1`.
2. Envie `subscription-cancelled.json`.
3. **Esperado:** `CanceledAt` continua `T1` (`??=` preserva), `Status='Canceled'`.

### E-10 — `cancelled` após cancelamento em trial (sub removida)
1. Cancele em trial (T-10) → sub hard-deleted.
2. Envie `subscription-cancelled.json`.
3. **Esperado:** **200**, no-op, mas `WebhookEvents` **é gravado** (idempotência preservada).

### E-11 — `checkout.refunded` derruba o acesso na hora *(RF-09.1)*
1. Sub `Active` entitled, `Payment` `Paid` com `bill_qa0001`.
2. `checkout-refunded.json` com `BILL_ID='bill_qa0001'`.
3. **Esperado:** `Payment.Status='Refunded'`; `Subscriptions.Status='Expired'`,
   `CurrentPeriodEnd = now` → `GET /api/products` → **402 imediato**.

### E-12 — `checkout.disputed`
Idem E-11 com `checkout-disputed.json` → `Payment.Status='Disputed'`, sub `Expired`.

### E-13 — ⚠️ `subscription.trial_started` (fluxo inativo)
1. Sub `Pending` com `TrialEndsAt = NULL`.
2. Envie `subscription-trial-started.json` (payload **real**: não tem nó `checkout`).
3. **Observe:** o processador lê `TrialEndsAt` de **`checkout.trialEndsAt`**, não de
   `subscription.trialEndsAt`. Sem nó `checkout`, `evt.TrialEndsAt` é `null`; o plano não tem
   `TrialDays`; então `sub.TrialEndsAt` permanece `NULL` → `CurrentPeriodEnd = NULL`.
4. **Consequência a confirmar:** `IsEntitled(Trialing, TrialEndsAt=null)` retorna **`true`**, e
   `ExpireTrialingPastEndAsync` (que compara `TrialEndsAt < now`) **nunca** expira. Acesso gratuito
   permanente. Ver §17 #3.
5. Confirme também que `Users.HasUsedTrial` foi marcado.

---

## 8. Suíte P — Troca de plano

> RF-04. Requer gateway para os casos com `GatewaySubscriptionId`.

- **P-01** — Sem assinatura viva → `POST /change-plan` → **400 "Nenhuma assinatura ativa para trocar."**
- **P-02** — Sub `Canceled` → **400** (mesma mensagem).
- **P-03** — Mesmo plano → **400 "Você já está neste plano."**
- **P-04** — Trial PDV-side → ver **T-09** (troca local, sem gateway).
- **P-05** — Sub `Pending` (checkout não pago) → **400** (não é `Active`/`Trialing`).
- **P-06** — Sub `Active` **sem** `GatewaySubscriptionId` (force `NULL` no SQL) →
  **400 "Troca de plano disponível apenas para assinaturas já ativadas no gateway."**
- **P-07** — Sub `Active` com `subs_` → chama `POST subscriptions/change-plan` no gateway;
  `PlanId` muda **imediatamente**; `CurrentPeriodEnd` **não** muda. Depois envie E-06 e confirme
  que a reconciliação é idempotente (nada muda de novo).
- **P-08** — Falha do gateway na troca (aponte `BaseUrl` para um host inválido) →
  `PaymentGatewayException`; **`PlanId` local não pode mudar** (o gateway é chamado antes do update).
- **P-09** *(RF-04.5, bug #5)* — Na UI, "Fazer upgrade agora" com sub paga dispara a troca
  **sem `ConfirmDialog`** e sem avisar da cobrança imediata. Registrar como bug aberto.

---

## 9. Suíte X — Cancelamento

> RF-06.

- **X-01** — Sem assinatura → `POST /cancel` → **400 "Nenhuma assinatura ativa para cancelar."**
- **X-02** — Cancelar em trial → ver **T-10** (`accessRevoked: true`).
- **X-03** — Cancelar sub `Active` → `{ accessRevoked: false }`, `Status='Canceled'`,
  `CanceledAt=now`, **`CurrentPeriodEnd` preservado**. Módulos continuam **200** até o fim do período.
- **X-04** — UI: `ConfirmDialog` com texto diferente por estado (trial = perda de acesso + exclusão da
  loja + link de exportação; ativa = "não renova, acesso até {data}").
- **X-05** — Cancelar sub `Active` **com** `subs_` → confirme no log que
  `POST subscriptions/cancel` foi chamado **antes** da persistência local.
- **X-06** — Falha do gateway no cancel (`BaseUrl` inválida) → exceção; sub **continua `Active`**
  (nada persistido). O usuário deve poder tentar de novo.
- **X-07** — Employee tenta cancelar → **403**.

---

## 10. Suíte R — Reativação

> RF-08.

- **R-01** — Sub `Expired` → card "Assine para continuar usando" → `PlansDialog` → `PlanCheckoutDialog`
  → `checkoutUrl`. Ver C-07.
- **R-02** — Sub `Canceled` **dentro** do período pago → a UI deve exibir o aviso
  *"Reativar agora gera uma nova cobrança imediata"* (`hasRemainingAccess`).
- **R-03** — Após reativar (E-01 + E-02 com novo `bill_`), a linha de `Subscription` é a mesma;
  `Payments` acumula o histórico (cobrança antiga + nova).

---

## 11. Suíte J — Job de expiração

> RF-01.3 / RF-05.4. `SubscriptionExpiryBackgroundService`: roda no startup e a cada 1h.

- **J-01** — `Trialing` com `TrialEndsAt` no passado → após `docker compose restart api` → `Expired`.
  Log: `"Trials expirados por vencimento: N"`.
- **J-02** — `Canceled` com `CurrentPeriodEnd` no passado → `Expired`.
  Log: `"Assinaturas canceladas expiradas por vencimento: N"`.
- **J-03** — `Trialing` com `TrialEndsAt = NULL` → **não expira** (o `WHERE` compara com `now`).
  Combinado com E-13, é o cenário de acesso permanente.
- **J-04** *(RF-05.4, bug #13)* — `Active` com `CurrentPeriodEnd` no passado:
  - `GET /api/products` → **402** (o `IsEntitled` barra corretamente); **e**
  - `Status` continua **`Active`** (nenhum job o move) e a UI mostra "Ativo / Renovação em {data passada}".
  - Registrar como bug aberto: banner incoerente, sem dunning nem aviso de falha de cobrança.
- **J-05** — O job varre **todos os usuários** (sem filtro de tenant). Crie 2 usuários com trials
  vencidos e confirme que **ambos** viram `Expired` numa única varredura.

---

## 12. Suíte G — Enforcement 402 e limites

> RF-07, RF-10.2.

- **G-01** — Sem assinatura (`None`): todo `[RequireModule]` → **402 `NOT_IN_PLAN`**.
- **G-02** — Código do erro: módulo **e** feature retornam `NOT_IN_PLAN` (não existe `MODULE_NOT_IN_PLAN`
  no backend — `backend/CLAUDE.md` está desatualizado, bug #15).
- **G-03** — `utils/apiError.ts` transforma o 402 em toast amigável de upgrade.
- **G-04** — Limite `employees` (Essencial = 2): criar o **3º** funcionário → **402 `PLAN_LIMIT_EXCEEDED`**
  com detalhe *"Seu plano permite no máximo 2."*
- **G-05** — Limite `stores` (Essencial = 1): criar a 2ª loja → **402 `PLAN_LIMIT_EXCEEDED`**.
  No Pro (5), a 6ª loja → 402.
- **G-06** — Limite ilimitado (`-1`): no Pro, criar 10 funcionários → todos **200**.
- **G-07** — `saleHistoryDays` (Essencial = 90): listar vendas sem filtro de data → o `SaleService`
  força o piso em `now - 90d`. Crie uma venda com `CreatedAt` de 120 dias atrás (SQL) e confirme
  que ela **não** aparece no Essencial e **aparece** no Pro.
- **G-08** — ⚠️ `auditDays` está no `PlanLimits` e no seed, mas **nenhum service o consome**
  (`grep` não encontra call site). Confirme que os logs de auditoria **não** são truncados por plano
  e registre como limite declarado-mas-não-aplicado.
- **G-09** *(RF-07.4, ❌)* — Sem plano, o usuário navega o app normalmente e só recebe toasts 402
  soltos. Não há guard/tela global "assine para continuar". Registrar como lacuna.

---

## 13. Suíte H — Histórico de cobranças

> RF-11.

- **H-01** — `GET /api/payments/history?page=1&pageSize=10` como `Owner` → 200, paginado.
- **H-02** — Como `Employee` → **403**.
- **H-03** — Usuário A não vê cobranças do usuário B (scoped por `UserId`, sem query filter de tenant).
- **H-04** — Cada linha traz método/cartão (`visa •••• 4242`), tipo, valor, status, data e recibo.
- **H-05** *(bug #14, 🟡)* — Confirme que nenhum `Payment` real produz `method === 'Pix'` nem
  `Kind='PixSubscription'`. O código morto no `BillingPaymentsSection` é inofensivo, mas deve ser limpo.

---

## 14. Suíte M — Multi-loja e Employee

> RF-10.

- **M-01** — Owner com 2 lojas e 1 assinatura: `/me` retorna o **mesmo** plano nas duas
  (troque de loja com `SwitchTenant` e reconfira).
- **M-02** — `Employee` de uma loja chama `GET /subscriptions/me` → **200** (leitura liberada),
  vendo o plano do **Owner** do tenant atual.
- **M-03** — Onboarding pendente (JWT sem `tenantId`): `ResolveForCurrentTenantAsync` usa o próprio
  `userContext.UserId`. Um usuário que assinou antes de criar a loja deve ver `status: "Active"` em `/me`.
- **M-04** — Cancelar em trial desativa **todas** as lojas do Owner (T-10), não só a atual.
- **M-05** — Entidades de billing (`Subscription`, `Payment`, `GatewayCustomer`, `WebhookEvent`, `Plan`)
  não têm query filter de tenant. Confirme, com dois tenants distintos, que não há vazamento —
  a filtragem é por `UserId` no repositório.

---

## 15. Suíte S — Seed e catálogo

> RF-12.

- **S-01** — Reinicie a API duas vezes → `Plans` continua com **4** linhas (upsert idempotente por
  `ExternalProductId`).
- **S-02** — Altere `EntitledModulesJson` de um plano na mão → reinicie → o seed **reescreve** os
  entitlements/limites de volta.
- **S-03** — `Plans`: Essencial concede 10 módulos e **0** features; Pro concede 10 módulos + **13** features.
  (O comentário "9 FEATURES" no `EntitlementCatalog` está errado — bug #11.)
- **S-04** — Limites: Essencial `{employees:2, stores:1, saleHistoryDays:90, auditDays:7}`;
  Pro `{employees:-1, stores:5, saleHistoryDays:-1, auditDays:-1}`.
- **S-05** — `frontend/src/constants/entitlements.ts` cobre as mesmas 13 features + 4 limites, com
  rótulos PT-BR. Uma chave nova no backend sem espelho no frontend aparece sem rótulo na UI.

---

## 16. Suíte U — Regressões de UI e bugs abertos

> Confirmar o estado dos itens da §13 de `docs/subscriptions.md`.

| # | Verificar | Esperado hoje |
|---|---|---|
| **U-01** (#4, 🟠) | Sub `Expired` na tela de Assinatura | Banner mostra nome+preço do plano e chip "EXPIRADO", mas o card "O que seu plano inclui" fica **vazio** (`entitlements: []`). Incoerente. |
| **U-02** (#5, 🔴) | "Fazer upgrade agora" com sub paga | Dispara `changePlan.mutate()` **direto**, sem confirmação e sem avisar da cobrança. |
| **U-03** (#7, 🟡) | Texto do toggle anual | Ainda diz *"Economize ganhado 2 meses grátis."* |
| **U-04** (#8, 🟡) | `PlanCheckoutDialog` | Branch `{plan.trialDays ? …}` nunca executa (todos os planos têm `TrialDays = null`). |
| **U-05** (#3, ✅) | Sem plano | Título "Plano Sem plano ativo", chip "SEM PLANO". |
| **U-06** (#6, ✅) | Reativar dentro do período | Aviso "Reativar agora gera uma nova cobrança imediata". |
| **U-07** (#2, ✅) | Qualquer tela de billing | Nenhum vestígio de PIX visível (`PixQrDialog` não existe). |
| **U-08** | Banner global | `useSyncSubscriptionToStore` espelha o resumo no slice `auth` — trocar de loja deve reidratar. |

---

## 17. Hipóteses de bug levantadas na leitura do código

> Não são achados confirmados — são os pontos onde eu esperaria o teste falhar. Cada um tem o teste
> correspondente. Se algum se confirmar, vale abrir issue e atualizar `docs/subscriptions.md` §13.

**#1 — `subscription.cancelled` sobrescreve um `Payment` já pago.** *(teste E-08b)*
`ApplyCancelled` faz `payment.Status = PaymentStatus.Cancelled` sem guarda. O payload real do
`subscription.cancelled` traz o `checkout.id` do billing original — que, numa assinatura ativa, é um
`Payment` **`Paid`**. Resultado provável: a última cobrança paga aparece como "Cancelada" no histórico.
*Correção sugerida:* só marcar `Cancelled` se `payment.Status == Pending`.

**#2 — `Payment.PeriodEnd` depende da ordem de chegada dos webhooks.** *(testes E-01, E-04)*
`SetPeriod` copia `sub.CurrentPeriodEnd` no instante do `checkout.completed`. Na **primeira** cobrança
esse campo ainda é `NULL` (a sub só ganha período no `subscription.completed`), então o `Payment`
inicial nasce com `PeriodEnd = NULL`. Numa renovação fora de ordem, nasce com o período **antigo**.
*Correção sugerida:* derivar o período do plano em vez de copiar o estado corrente.

**#3 — `subscription.trial_started` pode conceder acesso permanente.** *(testes E-13, J-03)*
O processador lê o fim do trial de `checkout.trialEndsAt`, mas o payload real desse evento
(`docs/abacatepay.md` §6.3) **não tem nó `checkout`** — o campo está em `subscription.trialEndsAt`.
Com `TrialEndsAt = NULL`, `IsEntitled` devolve `true` e `ExpireTrialingPastEndAsync` nunca expira.
Hoje o fluxo está inativo (planos sem `trialDays`), mas basta alguém marcar `trialDays` num produto no
painel do AbacatePay para ativá-lo.
*Correção sugerida:* ler também `data.subscription.trialEndsAt`, e nunca deixar `Trialing` com data nula.

**#4 — Payload malformado gera retentativa infinita.** *(teste W-06)*
`processor.Parse(rawBody)` está **fora** do `try/catch` do `WebhooksController`, então uma
`JsonException` vira **500** e o gateway retenta para sempre um corpo que nunca vai parsear.
*Correção sugerida:* capturar `JsonException` → **400** (erro do emissor, não nosso).

**#5 — `auditDays` é um limite declarado que ninguém aplica.** *(teste G-08)*
`PlanLimits.AuditDays` aparece no seed e na UI de "Recursos e limites", mas não há nenhuma chamada a
`EnsureWithinLimitAsync(PlanLimits.AuditDays, …)` nem filtro equivalente ao de `SaleHistoryDays`.
O plano Essencial promete "auditoria 7d" e entrega ilimitado.

**#6 — `.env.example` incompleto/divergente.** *(PRE-01)*
Falta `AbacatePay__WebhookSecret` (sem ele **todo** webhook responde 401) e `AbacatePay__BaseUrl`
aponta para `/v1` enquanto o client usa caminhos v2.

---

## 18. Matriz de rastreabilidade RF → teste

| RF | Testes |
|---|---|
| RF-01.1 … RF-01.6 | T-01, T-02, T-03, T-04, T-05, T-06, T-07, **T-08 (❌ lacuna)** |
| RF-02.1 … RF-02.7 | C-01…C-10 |
| RF-03.1 … RF-03.7 | W-01…W-14, E-01, E-02 |
| RF-04.1 … RF-04.5 | P-01…P-09, T-09, E-06, E-07 |
| RF-05.1 … RF-05.4 | E-02b, E-03, E-04, **J-04 (❌ lacuna)** |
| RF-06.1 … RF-06.5 | X-01…X-07, T-10, E-08, E-08b, E-09, E-10 |
| RF-07.1 … RF-07.5 | G-01, G-02, G-03, **G-09 (❌)**, U-01 |
| RF-08.1, RF-08.2 | R-01, R-02, R-03, C-06, C-07 |
| RF-09.1 | E-11, E-12 |
| RF-10.1 … RF-10.5 | M-01…M-05, G-05 |
| RF-11.1, RF-11.2 | H-01…H-05 |
| RF-12.1 … RF-12.3 | S-01…S-05 |
| RF-13.1 … RF-13.3 | U-07, H-05, C-04 |

---

## 19. Registro de execução

Copie a tabela por rodada. Um teste só é ✅ com a evidência (SQL, log ou print) anexada.

| Teste | Data | Resultado | Evidência / observação |
|---|---|---|---|
| PRE-01 | | ⬜ | |
| T-01 | | ⬜ | |
| … | | | |
| E-08b | | ⬜ | *confirma o bug #1?* |
| E-13 | | ⬜ | *confirma o bug #3?* |
| W-06 | | ⬜ | *confirma o bug #4?* |
| G-08 | | ⬜ | *confirma o bug #5?* |

**Ordem sugerida de execução:**
`PRE-01` → suíte **W** (rápida, sem gateway) → suíte **E** (mock) → **T** → **C** → **P**/**X**/**R**
→ **J** → **G** → **H**/**M**/**S** → **U**.

A suíte W+E cobre a maior parte do risco e roda inteira em minutos, sem tocar o AbacatePay.
