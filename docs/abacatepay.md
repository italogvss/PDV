# AbacatePay — Gateway de Pagamentos (PDV-Ultra)

> Fonte única de verdade da integração com o **AbacatePay**: endpoints consumidos, estrutura de
> request/response, webhooks, payloads e fluxos de assinatura. Consolida os antigos
> `abacatepay-webhook-payload.md`, `fluxo-abacate-pay.md` e a skill `abacatepay-llm.md`.
>
> **Escopo do PDV-Ultra:** apenas **assinaturas recorrentes por cartão**. Endpoints/fluxos de PIX
> (Checkout Transparente) existem na base de código, mas **não fazem parte do fluxo de produção** —
> ver [Anexo: PIX](#anexo-endpoints-de-pix-não-usados-em-produção).

## Índice

1. [Fundamentos da API](#1-fundamentos-da-api)
2. [Configuração no projeto](#2-configuração-no-projeto)
3. [Endpoints consumidos pelo backend](#3-endpoints-consumidos-pelo-backend)
4. [Estrutura de request/response](#4-estrutura-de-requestresponse)
5. [Webhooks](#5-webhooks)
6. [Payloads de webhook (cartão)](#6-payloads-de-webhook-cartão)
7. [Fluxos de negócio](#7-fluxos-de-negócio)
8. [Notas e inconsistências documentadas](#8-notas-e-inconsistências-documentadas)
9. [Referências oficiais](#9-referências-oficiais)
10. [Anexo: endpoints de PIX](#anexo-endpoints-de-pix-não-usados-em-produção)

---

## 1. Fundamentos da API

| Item | Valor |
|---|---|
| Base URL (v2) | `https://api.abacatepay.com/v2` |
| Autenticação | Header `Authorization: Bearer <API_KEY>` em toda requisição |
| Moeda | Sempre **BRL** |
| Valores monetários | Sempre em **centavos** (`10000` = R$ 100,00) |
| Content-Type | `application/json` |
| Envelope de resposta | `{ "data": {...}, "success": true, "error": null }` |

**Regras gerais:**

- Um **Produto** com `cycle` definido (`WEEKLY`, `MONTHLY`, `SEMIANNUALLY`, `ANNUALLY`) precisa existir
  antes de criar uma assinatura. No PDV-Ultra o produto é referenciado por `Plan.ExternalProductId`.
- **Clientes são únicos por CPF/CNPJ (`taxId`)** — criar um cliente com `taxId` já existente retorna o
  existente. `email` é obrigatório.
- Assinaturas aceitam **exatamente 1 item** no checkout; métodos padrão `["CARD"]`.
- Webhooks exigem URL **HTTPS pública**; o corpo é assinado via **HMAC-SHA256**.

---

## 2. Configuração no projeto

### Options — `AbacatePayOptions`

Seção `AbacatePay` no `appsettings`/env (`PDV.Infrastructure/.../AbacatePay/AbacatePayOptions.cs`):

```jsonc
"AbacatePay": {
  "ApiKey":        "<secret>",                         // Bearer token
  "WebhookSecret": "<secret>",                         // validado na query string do webhook
  "BaseUrl":       "https://api.abacatepay.com/v2",
  "BackUrl":       null                                 // legado; returnUrl hoje vem do frontend
}
```

> Segredos ficam no `.env` da raiz — **nunca commitados**.

### Injeção de dependência (`Program.cs`)

```csharp
builder.Services.Configure<AbacatePayOptions>(builder.Configuration.GetSection(AbacatePayOptions.SectionName));
builder.Services.AddScoped<IPaymentGateway, AbacatePayGateway>();
builder.Services.AddScoped<IPaymentWebhookProcessor, AbacatePayWebhookProcessor>();
builder.Services.AddHttpClient<IAbacatePayApiClient, AbacatePayApiClient>((sp, http) =>
{
    var options = sp.GetRequiredService<IOptions<AbacatePayOptions>>().Value;
    var baseUrl = options.BaseUrl.EndsWith('/') ? options.BaseUrl : options.BaseUrl + "/";
    http.BaseAddress = new Uri(baseUrl);
    http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);
});
```

### Arquitetura (3 camadas)

| Camada | Arquivo | Responsabilidade |
|---|---|---|
| **API client** | `AbacatePayApiClient` / `IAbacatePayApiClient` | "Como falar com a API": monta request, auth, envelope, erros e **retry** de transientes. Sem regra de negócio. |
| **Gateway** | `AbacatePayGateway` (`IPaymentGateway`) | Traduz modelos neutros do domínio ↔ payloads do AbacatePay. É a única abstração que a orquestração de assinatura conhece. |
| **Webhook** | `AbacatePayWebhookProcessor` (`IPaymentWebhookProcessor`) | Valida autenticidade e traduz o payload cru → `PaymentWebhookEvent`. Puro (não toca no banco). |

**Retry (`AbacatePayApiClient`):** até **3 tentativas** com backoff linear (`200ms * tentativa`) para falhas
transientes — HTTP `408`, `429`, `5xx`, `HttpRequestException` e timeout. Erros são encapsulados em
`PaymentGatewayException` com a mensagem de `error` do envelope.

---

## 3. Endpoints consumidos pelo backend

Todos relativos a `https://api.abacatepay.com/v2/`. Mapeamento **método do gateway → endpoint AbacatePay**:

| Método do gateway (`IPaymentGateway`) | HTTP | Endpoint | Quando é chamado |
|---|---|---|---|
| `EnsureCustomerAsync` | `POST` | `customers/create` | No início do checkout — garante o cliente no gateway (idempotente por `taxId`). |
| `CheckIfPlanExistsAsync` | `GET` | `products/get?id={externalId}` | Antes do checkout — valida que o produto/plano existe no gateway. |
| `CreateSubscriptionCheckoutAsync` | `POST` | `subscriptions/create` | Cria o checkout hospedado da assinatura (cartão) e retorna a `url`. |
| `ChangeSubscriptionPlanAsync` | `POST` | `subscriptions/change-plan` | Troca o produto/plano de uma assinatura ativa. |
| `CancelSubscriptionAsync` | `POST` | `subscriptions/cancel` | Cancela a assinatura no gateway. |
| `GetChargeStatusAsync` | `GET` | `checkouts/get?id={id}` | Fallback de polling do status (preferir webhook). Ramo `bill_`. |

> **Nota sobre `GetChargeStatusAsync`:** o gateway roteia por prefixo do `chargeId` — `pix*` →
> `transparents/check`; caso contrário → `checkouts/get`. No fluxo de cartão o `chargeId` é sempre um
> `bill_...`, então usa `checkouts/get`.

Endpoints de PIX (`transparents/create`, `transparents/check`, `pixQrCode/simulate`) existem no client mas
não são usados em produção — ver [anexo](#anexo-endpoints-de-pix-não-usados-em-produção).

---

## 4. Estrutura de request/response

Modelos em `AbacatePay/Models/AbacatePayModels.cs`. Envelope padrão:

```csharp
record AbacateEnvelope<T>(T? Data, bool Success, JsonElement? Error);
```

### 4.1 `POST customers/create`

**Request** (body flat, sem wrapper `data`):

```json
{ "email": "...", "name": "...", "taxId": "...", "cellphone": "..." }
```

**Response** (`data`): `{ "id": "cust_...", "email", "name", "taxId", "cellphone" }`

### 4.2 `POST subscriptions/create`

**Request** (mesmo shape de checkout, flat):

```json
{
  "items": [{ "id": "prod_...", "quantity": 1 }],
  "customerId": "cust_...",
  "externalId": "<Subscription.Id (GUID) do PDV-Ultra>",
  "methods": ["CARD"],
  "coupons": ["CUPOM"],           // opcional
  "returnUrl": "https://...",     // opcional (vem do frontend)
  "completionUrl": "https://...", // opcional
  "metadata": { "userId": "...", "planId": "...", "subscriptionId": "..." }
}
```

- `externalId` = **`Subscription.Id`** local — chave primária de correlação nos webhooks `checkout.*`.
- **Sem `trialDays`**: o trial de 30 dias é controlado pela aplicação (PDV-side), não pelo gateway.

**Response** (`data`): `{ "id": "bill_...", "url", "amount", "status" }` — a `url` é o checkout hospedado.

### 4.3 `POST subscriptions/change-plan`

**Request:** `{ "id": "subs_...", "productId": "prod_...", "quantity": 1 }`

**Response** (`data`): `{ "id": "subu_...", "subscriptionId", "status": "PENDING", "productId", "quantity", "newAmount" }`
— objeto de atualização pendente; confirmação chega via webhook `subscription.plan_changed`.

### 4.4 `POST subscriptions/cancel`

**Request:** `{ "id": "subs_..." }` → **Response** (`data`): `{ "id", "status": "CANCELLED" }`

### 4.5 `GET checkouts/get?id={id}` e `GET products/get?id={externalId}`

- `checkouts/get` → `{ "id", "status" }` (status do billing).
- `products/get` → produto completo; **404 ou `error` preenchido = produto inexistente** →
  `CheckIfPlanExistsAsync` retorna `false`.

---

## 5. Webhooks

### 5.1 Endpoint receptor

```
POST /api/webhooks/abacatepay?webhookSecret=<secret>
```

Anônimo (`[AllowAnonymous]`), em `WebhooksController`. Pipeline de processamento:

```
1. Valida webhookSecret da query  → 401 se inválido   (FixedTimeEquals contra AbacatePayOptions.WebhookSecret)
2. Lê o corpo RAW (EnableBuffering)                    (necessário para o HMAC)
3. Valida HMAC do header X-Webhook-Signature → 403     (ver 5.2)
4. Parse → PaymentWebhookEvent
5. Idempotência: evento já processado? → 200 sem reprocessar   (tabela WebhookEvent)
6. BillingWebhookService.ProcessAsync(evt)             (estado + registro do evento num ÚNICO SaveChanges atômico)
   └─ falha → 500 (nada persistido; gateway pode reenviar com segurança)
```

### 5.2 Segurança — dupla verificação

1. **Secret na URL** — `?webhookSecret=` comparado em tempo constante contra `AbacatePayOptions.WebhookSecret`.
2. **HMAC-SHA256 do corpo raw** — header `X-Webhook-Signature`. A chave HMAC é a **chave pública fixa do
   AbacatePay** (a mesma para todos os merchants):

   ```
   t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6i
   Iga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0K
   Z3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9
   ```

   `expected = Base64(HMACSHA256(chave, rawBody))`, comparado com o header via `FixedTimeEquals`.

### 5.3 Idempotência

- `subscription.*` trazem `id` estável (`log_...`) → usado como `EventId`.
- `checkout.*` **não** trazem `id` → `EventId = HEX(SHA256(rawBody))` (retentativas com mesmo corpo colidem).
- Registro em `WebhookEvent` na **mesma transação** que aplica o estado — se o `SaveChanges` falhar, nada é
  persistido e o gateway pode reenviar.

### 5.4 Eventos e ações aplicadas

Mapa `event` (AbacatePay) → `PaymentWebhookType` → ação em `BillingWebhookService`:

| `event` | Tipo interno | Ação |
|---|---|---|
| `checkout.completed` | `CheckoutCompleted` | Se `PAID`: dá baixa no `Payment` (ou cria um novo já pago — renovação). Se `PENDING` (trial): apenas captura o cartão no `Payment` pendente. |
| `subscription.trial_started` | `SubscriptionTrialStarted` | `Status = Trialing`, grava `GatewaySubscriptionId`, define `TrialEndsAt`/`CurrentPeriodEnd`, marca trial usado. *(defensivo — ver §8)* |
| `subscription.completed` | `SubscriptionCompleted` | `Status = Active`, grava `GatewaySubscriptionId`, `CurrentPeriodEnd = agora + ciclo`. |
| `subscription.renewed` | `SubscriptionRenewed` | Estende o ciclo (`CurrentPeriodEnd`). A baixa do pagamento vem no `checkout.completed` correspondente. |
| `subscription.plan_changed` | `SubscriptionPlanChanged` | Confirmação idempotente: garante `PlanId` (mapeado pelo `productId`) e registra a cobrança da troca. Não altera datas. |
| `subscription.cancelled` | `SubscriptionCancelled` | `Status = Canceled`, `CanceledAt`; marca `Payment` como cancelado. |
| `checkout.refunded` | `CheckoutRefunded` | `Payment = Refunded`; assinatura → `Expired`, `CurrentPeriodEnd = agora`. |
| `checkout.disputed` | `CheckoutDisputed` | `Payment = Disputed`; assinatura → `Expired`. |
| *(desconhecido)* | `Unknown` | Registrado como processado, sem efeito. |

**Correlação da assinatura** (`ResolveSubscriptionAsync`, em ordem de prioridade):
`metadata.subscriptionId` → `externalId` (= `Subscription.Id`) → `SubscriptionId` do gateway (`subs_`) →
`metadata.userId` → `customerId` do gateway (`cust_`).

**Correlação do pagamento** (`ResolvePaymentAsync`): estritamente por `GatewayChargeId` (`bill_`) — sem
fallback por "pendente mais recente", para não marcar por engano um pagamento de checkout anterior.

---

## 6. Payloads de webhook (cartão)

Envelope raiz: `{ id?, event, apiVersion, devMode, data }`. Seções de `data` presentes por família de evento:

- `checkout`, `customer`, `payerInformation` → **sempre**.
- `subscription`, `payment` → **ausentes** no `checkout.completed`.
- Campos extras na raiz de `data` (`productId`, `newAmount`, `pendingUpdateId`…) → **exclusivos** de
  `subscription.plan_changed`.

> Nos payloads de PIX, muda apenas o bloco `payerInformation` (`"method": "PIX"` com nome/taxId em vez de
> `CARD` com `number`/`brand`). O restante da estrutura é idêntico.

### 6.1 `checkout.completed` — cobrança real (cartão)

```json
{
  "event": "checkout.completed",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "checkout": {
      "id": "bill_abc123xyz",
      "externalId": "pedido-123",
      "url": "https://app.abacatepay.com/pay/bill_abc123xyz",
      "amount": 10000,
      "paidAmount": 10000,
      "platformFee": 120,
      "frequency": "ONE_TIME",
      "items": [{ "id": "prod_xyz", "quantity": 1 }],
      "status": "PAID",
      "methods": ["CARD"],
      "customerId": "cust_abc123",
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "installmentsCount": 3,
      "createdAt": "2024-12-06T18:56:15.538Z",
      "updatedAt": "2024-12-06T18:56:20.000Z"
    },
    "customer": {
      "id": "cust_abc123",
      "name": "João Silva",
      "email": "joao@exemplo.com",
      "taxId": "123.***.***-**"
    },
    "payerInformation": {
      "method": "CARD",
      "CARD": { "number": "1234", "brand": "VISA" }
    }
  }
}
```

### 6.2 `checkout.completed` — trial (sem cobrança)

No fluxo com trial no gateway, o `checkout.completed` chega com `amount`/`paidAmount` refletindo que **nada
foi cobrado** (`amount: 0`, `paidAmount: null`, `status: "PENDING"`) — apenas tokeniza o cartão. Traz também
`trialDays`, `trialEndsAt`, `nextChargeAt`:

```json
{
  "event": "checkout.completed",
  "apiVersion": 2,
  "devMode": true,
  "data": {
    "checkout": {
      "id": "bill_rPMZeD4eJcmSPKwMzZW3LLWF",
      "externalId": "subs-12",
      "amount": 0,
      "paidAmount": null,
      "status": "PENDING",
      "methods": ["CARD"],
      "frequency": "SUBSCRIPTION",
      "items": [{ "id": "prod_WjdNGNcB11RNXfbNmtNkqQ1N", "quantity": 1 }],
      "customerId": "cust_aJ2GbrULKW3fqMU3ffrXr35P",
      "trialDays": 30,
      "trialEndsAt": "2026-07-19T23:59:59.999Z",
      "nextChargeAt": "2026-07-19T23:59:59.999Z",
      "card": { "maxInstallments": 1 }
    },
    "customer": { "id": "cust_aJ2GbrULKW3fqMU3ffrXr35P", "name": "Italo Gavassi", "email": "italo.gavassi@gmail.com", "taxId": null },
    "payerInformation": { "method": "CARD", "CARD": { "number": "4242", "brand": "visa" } }
  }
}
```

> ⚠️ `checkout.amount = 0` no trial é **correto** — o `AmountCents` resolvido deve ser 0 (nada cobrado).
> A cascata de resolução do valor é `checkout.paidAmount → payment.paidAmount → checkout.amount → transp`.

### 6.3 `subscription.trial_started`

```json
{
  "id": "log_trialXYZ123abc",
  "event": "subscription.trial_started",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "subscription": {
      "id": "subs_tAFqDWBhcEYTjQh2K0ZYDHau",
      "amount": 4990,
      "currency": "BRL",
      "method": "CARD",
      "status": "ACTIVE",
      "frequency": "MONTHLY",
      "trialDays": 7,
      "trialEndsAt": "2024-11-11T23:59:59.999Z",
      "createdAt": "2024-11-04T18:38:28.573Z",
      "updatedAt": "2024-11-04T18:38:28.573Z",
      "canceledAt": null, "cancelPolicy": null, "cancelledDueTo": null
    },
    "customer": { "id": "cust_def456", "name": "Maria Santos", "email": "maria@exemplo.com", "taxId": "12.***.***/0001-**" }
  }
}
```

> O `payment.id` no trial usa prefixo **`card_`** (tokenização, `status: "APPROVED"`, sem débito), enquanto uma
> cobrança real usa **`char_`** (`status: "PAID"`).

### 6.4 `subscription.completed` (cartão)

Traz **todos** os nós (`subscription`, `payment`, `checkout`, `customer`, `payerInformation`).

```json
{
  "id": "log_taQArRTApemxwcbw5EJeF3hS",
  "event": "subscription.completed",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "subscription": {
      "id": "subs_tAFqDWBhcEYTjQh2K0ZYDHau",
      "amount": 2990, "currency": "BRL", "method": "CARD",
      "status": "ACTIVE", "frequency": "MONTHLY",
      "createdAt": "2024-12-06T20:00:00.000Z", "updatedAt": "2024-12-06T20:00:05.000Z",
      "canceledAt": null, "cancelPolicy": null, "cancelledDueTo": null
    },
    "customer": { "id": "cust_def456", "name": "Maria Santos", "email": "maria@exemplo.com", "taxId": "12.***.***/0001-**" },
    "payment": {
      "id": "char_xyz789", "externalId": "pedido-456",
      "amount": 2990, "paidAmount": 2990, "platformFee": 100,
      "status": "PAID", "methods": ["CARD"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T20:00:00.000Z", "updatedAt": "2024-12-06T20:00:05.000Z"
    },
    "payerInformation": { "method": "CARD", "CARD": { "number": "1234", "brand": "VISA" } },
    "checkout": {
      "id": "bill_jskd3TMfScHZDJe5NSZjTmQ4",
      "externalId": null,
      "url": "https://app.abacatepay.com/pay/bill_jskd3TMfScHZDJe5NSZjTmQ4",
      "amount": 2990, "paidAmount": 2990, "platformFee": 100,
      "frequency": "SUBSCRIPTION",
      "items": [{ "id": "prod_bx4BstRWhQ2SUcKsPt4c6pmq", "quantity": 1 }],
      "status": "PAID", "methods": ["CARD"], "customerId": "cust_def456",
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T19:59:57.819Z", "updatedAt": "2024-12-06T20:00:05.000Z"
    }
  }
}
```

> `checkout.externalId = null` no `subscription.completed` e `subscription.renewed` (o checkout é gerado
> internamente pela plataforma). Nesses casos, o `externalId` de correlação vem de `payment.externalId`.

### 6.5 `subscription.renewed` (cartão)

Idêntico ao `subscription.completed`, `event: "subscription.renewed"`, `updatedAt` do novo período e novo
`checkout.id` (`bill_renew...`). Enviado a cada renovação; acompanha um `checkout.completed` (`PAID`) que dá a
baixa da cobrança.

### 6.6 `subscription.plan_changed` (cartão)

Campos extras **na raiz de `data`**: `changeSource`, `pendingUpdateId`, `productId`, `quantity`, `newAmount`,
`status`, `requestedAt`.

```json
{
  "event": "subscription.plan_changed",
  "apiVersion": 2,
  "devMode": true,
  "data": {
    "subscription": {
      "id": "subs_AZXCcsPN6HZhrHE0jDaBQd3u",
      "amount": 3500, "currency": "BRL", "method": "CARD",
      "status": "ACTIVE", "frequency": "MONTHLY",
      "createdAt": "2026-06-18T15:09:05.761Z", "updatedAt": "2026-06-18T15:09:05.761Z",
      "canceledAt": null, "cancelPolicy": null, "cancelledDueTo": null
    },
    "customer": { "id": "cust_AAda3uUtkDC5NYUxyFzrJzcR", "name": "Italo Gavassi", "email": "italo.gavassi@gmail.com", "taxId": "109.***.269-**" },
    "checkout": {
      "id": "bill_Nth3KyGuDPEheUeuhBU1Aw3H",
      "externalId": "0a50d090-2eca-4963-8e92-ca32194579d5",
      "amount": 3500, "paidAmount": 3500, "platformFee": 183,
      "frequency": "SUBSCRIPTION",
      "items": [{ "id": "prod_zC14fd6YWKx6cBshGhexD1Sp", "quantity": 1 }],
      "status": "PAID", "methods": ["CARD"], "customerId": "cust_H3zs20tkSZFbETQBgyQBrX3q"
    },
    "payment": {
      "id": "card_MxcN5q4FzsnRmaer3PATgxKh",
      "externalId": "0a50d090-2eca-4963-8e92-ca32194579d5",
      "amount": 3500, "paidAmount": 3500, "platformFee": 183,
      "status": "APPROVED", "methods": ["CARD"]
    },
    "payerInformation": { "method": "CARD", "CARD": { "number": "4242", "brand": "visa" } },
    "changeSource": "API_CHANGE_PLAN",
    "pendingUpdateId": "subu_tXwgt01XDQCeBx4kszsSsXru",
    "productId": "prod_uwUHpTew3Xe6sYgJKsHdLSey",
    "quantity": 1,
    "newAmount": 5000,
    "status": "PENDING",
    "requestedAt": "2026-06-19T20:49:06.440Z"
  }
}
```

### 6.7 `subscription.cancelled` (cartão)

`subscription.status = "CANCELLED"`, `canceledAt` e `cancelPolicy` (`"NOW"`) preenchidos. O `checkout.status`
segue `PENDING`/`PAID` — por isso o processador usa `subscription.status` como fonte do estado neste evento.

```json
{
  "event": "subscription.cancelled",
  "apiVersion": 2,
  "devMode": true,
  "data": {
    "subscription": {
      "id": "subs_M0KEWLHBzQjSg2myU5hckNFR",
      "amount": 3000, "currency": "BRL", "method": "CARD",
      "status": "CANCELLED", "frequency": "MONTHLY",
      "createdAt": "2026-06-19T19:53:15.836Z", "updatedAt": "2026-06-19T19:53:15.836Z",
      "canceledAt": "2026-06-19T20:06:45.377Z", "cancelPolicy": "NOW", "cancelledDueTo": null
    },
    "customer": { "id": "cust_AAda3uUtkDC5NYUxyFzrJzcR", "name": "Italo Gavassi", "email": "italo.gavassi@gmail.com", "taxId": "109.***.269-**" },
    "checkout": { "id": "bill_rPMZeD4eJcmSPKwMzZW3LLWF", "externalId": "subs-12", "status": "PENDING", "amount": 3000, "frequency": "SUBSCRIPTION" },
    "payment": { "id": "card_NSW4CWbUqHMwaaRffZThpUBd", "amount": 0, "status": "APPROVED", "methods": ["CARD"] },
    "payerInformation": { "method": "CARD", "CARD": { "number": "4242", "brand": "visa" } }
  }
}
```

### 6.8 `checkout.refunded` / `checkout.disputed` (cartão)

Mesmo shape do `checkout.completed` (`status: "PAID"`), acrescido de `"reason": "requested_by_customer"` na
raiz de `data`. O processador marca o `Payment` como `Refunded`/`Disputed` e expira a assinatura.

---

## 7. Fluxos de negócio

Endpoints internos em `SubscriptionsController` (`/api/subscriptions`, `[Authorize]`; ações de gestão exigem
role `Owner`/`Admin`). Serviço: `SubscriptionService`.

### 7.1 Contratação por cartão (fluxo ativo)

```
Frontend → POST /api/subscriptions/checkout   { planId, method: "CARD", couponCode?, returnUrl?, completionUrl? }
SubscriptionService.StartCheckoutAsync:
  1. Valida plano local + gateway.CheckIfPlanExistsAsync (products/get)
  2. Regras: bloqueia se já há assinatura Active/Trialing vigente; valida HasUsedTrial
  3. EnsureCustomerAsync            → POST customers/create  (idempotente)
  4. Monta Subscription (Pending) + metadata { userId, planId, subscriptionId }
  5. gateway.CreateSubscriptionCheckoutAsync → POST subscriptions/create
        externalId = Subscription.Id ; methods = ["CARD"]  (SEM trialDays)
  6. Persiste Subscription + Payment (Pending, GatewayChargeId = bill_...)
  7. Retorna { checkoutUrl }
Usuário paga na página hospedada
Webhooks: checkout.completed (PAID) + subscription.completed → assinatura Active, Payment baixado
```

> **Trial de 30 dias:** é **PDV-side** — criado na criação do tenant (`?plano=<slug>`), sem envolver o
> gateway. Ver `docs/subscriptions.md`. O checkout de assinatura **não** envia `trialDays`.

### 7.2 Renovação

Automática pelo gateway ao fim de cada ciclo. Chegam `subscription.renewed` (estende `CurrentPeriodEnd`) e
`checkout.completed` (`PAID`, registra novo `Payment` já pago via `CompleteChargeAsync`).

### 7.3 Mudança de plano (imediata, só cartão)

```
Frontend → POST /api/subscriptions/change-plan   { planId }
SubscriptionService.ChangePlanAsync:
  - Exige assinatura viva (Active/Trialing) no cartão com GatewaySubscriptionId
  - Fora de trial: não permite migrar para plano com trial
  - gateway.ChangeSubscriptionPlanAsync → POST subscriptions/change-plan (id, productId, quantity=1)
  - Atualiza PlanId local (em trial, recalcula TrialEndsAt/CurrentPeriodEnd)
Webhook subscription.plan_changed → confirmação idempotente + registro da cobrança da troca
```

Regras do gateway: **fora de trial** — muda a assinatura e atualiza dados de pagamento; **em trial** — muda o
plano mas **mantém** a data final do trial.

### 7.4 Cancelamento

```
Frontend → POST /api/subscriptions/cancel
SubscriptionService.CancelAsync:
  - Cancela no gateway PRIMEIRO (cartão com subs_) → POST subscriptions/cancel
  - Em TRIAL:  remoção FÍSICA da Subscription e Payments (exceção justificada ao soft delete;
               HasUsedTrial permanece true → sem novo trial). Acesso bloqueado imediatamente.
  - Pós-trial (Active): Status = Canceled, mantém acesso até CurrentPeriodEnd (período já pago).
Webhook subscription.cancelled → sincroniza o estado
```

Regras do gateway: **em trial** — o trial é mantido até `trialEndsAt`, mas **sem cobrança**; **ativo fora de
trial** — segue até a data de renovação.

---

## 8. Notas e inconsistências documentadas

- **Trial no gateway vs. PDV-side.** O fluxo de produção **não** usa `trialDays` no gateway — o trial de 30
  dias é 100% aplicação (ver `docs/subscriptions.md`). O handler de `subscription.trial_started` existe por
  robustez, mas não é acionado no fluxo atual.
- **`checkout.customerId` pode divergir de `customer.id`.** Inconsistência documentada da API (aparece no
  `subscription.trial_started`). O ID canônico do cliente é **`customer.id`** — o processador nunca usa
  `checkout.customerId` como primário.
- **`externalId = null`** em `subscription.completed`/`renewed` (checkout gerado internamente). A correlação
  cai para `payment.externalId` e, por fim, para o `subs_`/`cust_` do gateway.
- **`payment.id`: `card_` vs `char_`.** `card_` = tokenização sem débito (`APPROVED`); `char_` = cobrança real
  (`PAID`). O `payment.id` é a transação do cartão — **diferente** do `bill_` do billing (que é o
  `GatewayChargeId`).
- **Status no `subscription.cancelled`.** `subscription.status = CANCELLED` mas `checkout.status = PENDING`;
  o processador prioriza o status da assinatura neste evento.
- **`amount = 0` no trial** é intencional (nada cobrado) — o valor resolvido é `0`, não nulo.

---

## 9. Referências oficiais

Documentação: `https://docs.abacatepay.com`. Endpoints relevantes ao PDV-Ultra:

| Recurso | Endpoint |
|---|---|
| Referência de Assinaturas | `/pages/subscriptions/reference` |
| Criar assinatura | `POST /subscriptions/create` |
| Cancelar assinatura | `POST /subscriptions/cancel` |
| Clientes | `POST /customers/create`, `GET /customers/get` |
| Produtos | `POST /products/create`, `GET /products/get` |
| Checkouts | `GET /checkouts/one` (get) |
| Webhooks (segurança/eventos) | `/pages/webhooks/reference` |

> A skill `.claude/skills/abacatepay-llm.md` mantém o índice completo da API (inclui recursos não usados pelo
> PDV-Ultra: links de pagamento, cupons, payouts, PIX transfer, TrustMRR).

---

## Anexo: endpoints de PIX (não usados em produção)

O código contém suporte a **Checkout Transparente (PIX)**, mantido para eventual uso, mas **fora do fluxo de
produção** (o PDV-Ultra cobra apenas por cartão):

| Método do gateway | HTTP | Endpoint | Observação |
|---|---|---|---|
| `CreatePixChargeAsync` | `POST` | `transparents/create` | Body `{ method: "PIX", data: { amount, description, expiresIn, customer, metadata } }`. Retorna `brCode` + `brCodeBase64`. |
| `GetChargeStatusAsync` (ramo `pix*`) | `GET` | `transparents/check?id=` | Verifica status de um PIX. |
| `SimulatePixPaymentAsync` | `GET` | `pixQrCode/simulate?id=` | Simulação em devMode (`AdminController → POST /api/admin/test/simulate-pix`). |

Eventos correspondentes (`transparent.completed`/`refunded`/`disputed`) têm tratamento no processador
(`ApplyPixCompletedAsync`, etc.), mas não ocorrem no fluxo de cartão.
