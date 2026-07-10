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

**Response** (`data`): `{ "id": "subu_...", "subscriptionId", "status", "productId", "quantity", "newAmount" }`

- A troca é aplicada **na hora**, sem calcular proporcional e **sem emitir fatura**: o `newAmount` só é
  cobrado na próxima renovação.
- **Não há webhook de confirmação** — `subscription.plan_changed` não existe. Esta resposta é o único
  retorno. Quando os recursos passam a valer no PDV é decisão nossa: ver `docs/subscriptions.md` §7.4.

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

Os sete eventos que o gateway emite e a ação de cada um em `BillingWebhookService` estão em
**`docs/subscriptions.md` §10** — fonte única, para não divergir daqui. Dois eventos que **não
existem** e já foram removidos do mapeamento:

- `subscription.trial_started` — o trial é PDV-side, nenhum produto tem `trialDays`;
- `subscription.plan_changed` — a troca de plano não gera webhook (ver §4.3).

Qualquer `event` fora do mapa cai em `Unknown`: registrado como processado, sem efeito.

**Correlação da assinatura** (`ResolveSubscriptionAsync`, em ordem de prioridade):
`metadata.subscriptionId` → `externalId` (= `Subscription.Id`) → `SubscriptionId` do gateway (`subs_`) →
`metadata.userId` → `customerId` do gateway (`cust_`).

**Correlação do pagamento** (`ResolvePaymentAsync`): estritamente por `GatewayChargeId` (`bill_`) — sem
fallback por "pendente mais recente", para não marcar por engano um pagamento de checkout anterior.


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