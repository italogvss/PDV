Envelope raiz: `{ id?, event, apiVersion, devMode, data }`. Seções de `data` presentes por família de evento:

- `checkout`, `customer`, `payerInformation` → **sempre**, exceto em `subscription.payment_failed` e no
  `subscription.cancelled` por `max_payment_retries_exceeded`.
- `subscription`, `payment` → **ausentes** no `checkout.completed`.
- `installmentId`, `installmentNumber`, `retryNumber` na raiz de `data` → **exclusivos** de
  `subscription.payment_failed`.

> Não existe `subscription.plan_changed`: a troca de plano é aplicada de forma síncrona pelo endpoint
> `subscriptions/change-plan` e não gera webhook.

## checkout.completed
Disparado quando um pagamento via checkout é realizado. O payerInformation varia conforme o método.
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
      "CARD": {
        "number": "1234",
        "brand": "VISA"
      }
    }
  }
}

## checkout.refunded
Disparado quando um pagamento via checkout é reembolsado. O payerInformation varia conforme o método.

{
  "event": "checkout.refunded",
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
      "CARD": {
        "number": "1234",
        "brand": "VISA"
      }
    },
    "reason": "requested_by_customer"
  }
}

## subscription.completed

Disparado quando uma assinatura se torna ativa.

> `checkout.externalId = null` no `subscription.completed` e `subscription.renewed` (o checkout é gerado
> internamente pela plataforma). Nesses casos, o `externalId` de correlação vem de `payment.externalId`.

{
  "id": "log_taQArRTApemxwcbw5EJeF3hS",
  "event": "subscription.completed",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "subscription": {
      "id": "subs_tAFqDWBhcEYTjQh2K0ZYDHau",
      "amount": 2990,
      "currency": "BRL",
      "method": "CARD",
      "status": "ACTIVE",
      "frequency": "MONTHLY",
      "createdAt": "2024-12-06T20:00:00.000Z",
      "updatedAt": "2024-12-06T20:00:05.000Z",
      "canceledAt": null,
      "cancelPolicy": null,
      "cancelledDueTo": null
    },
    "customer": {
      "id": "cust_def456",
      "name": "Maria Santos",
      "email": "maria@exemplo.com",
      "taxId": "12.***.***/0001-**"
    },
    "payment": {
      "id": "char_xyz789",
      "externalId": "pedido-456",
      "amount": 2990,
      "paidAmount": 2990,
      "platformFee": 100,
      "status": "PAID",
      "methods": ["CARD"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T20:00:00.000Z",
      "updatedAt": "2024-12-06T20:00:05.000Z"
    },
    "payerInformation": {
      "method": "CARD",
      "CARD": {
        "number": "1234",
        "brand": "VISA"
      }
    },
    "checkout": {
      "id": "bill_jskd3TMfScHZDJe5NSZjTmQ4",
      "externalId": null,
      "url": "https://app.abacatepay.com/pay/bill_jskd3TMfScHZDJe5NSZjTmQ4",
      "amount": 2990,
      "paidAmount": 2990,
      "platformFee": 100,
      "frequency": "SUBSCRIPTION",
      "items": [{ "id": "prod_bx4BstRWhQ2SUcKsPt4c6pmq", "quantity": 1 }],
      "status": "PAID",
      "methods": ["CARD"],
      "customerId": "cust_def456",
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T19:59:57.819Z",
      "updatedAt": "2024-12-06T20:00:05.000Z"
    }
  }
}

## subscription.renewed
Disparado sempre que uma assinatura é renovada com sucesso.
Idêntico ao `subscription.completed`, `event: "subscription.renewed"`, `updatedAt` do novo período e novo
`checkout.id` (`bill_renew...`). Enviado a cada renovação; acompanha um `checkout.completed` (`PAID`) que dá a
baixa da cobrança.
{
  "id": "log_abc123xyz",
  "event": "subscription.renewed",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "subscription": {
      "id": "subs_tAFqDWBhcEYTjQh2K0ZYDHau",
      "amount": 2990,
      "currency": "BRL",
      "method": "CARD",
      "status": "ACTIVE",
      "frequency": "MONTHLY",
      "createdAt": "2024-12-06T20:00:00.000Z",
      "updatedAt": "2025-01-06T20:00:05.000Z",
      "canceledAt": null,
      "cancelPolicy": null,
      "cancelledDueTo": null
    },
    "customer": {
      "id": "cust_def456",
      "name": "Maria Santos",
      "email": "maria@exemplo.com",
      "taxId": "12.***.***/0001-**"
    },
    "payment": {
      "id": "char_xyz789",
      "externalId": "pedido-456",
      "amount": 2990,
      "paidAmount": 2990,
      "platformFee": 100,
      "status": "PAID",
      "methods": ["CARD"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2025-01-06T20:00:00.000Z",
      "updatedAt": "2025-01-06T20:00:05.000Z"
    },
    "payerInformation": {
      "method": "CARD",
      "CARD": {
        "number": "1234",
        "brand": "VISA"
      }
    },
    "checkout": {
      "id": "bill_renewxyz789",
      "externalId": null,
      "url": "https://app.abacatepay.com/pay/bill_renewxyz789",
      "amount": 2990,
      "paidAmount": 2990,
      "platformFee": 100,
      "frequency": "SUBSCRIPTION",
      "items": [{ "id": "prod_bx4BstRWhQ2SUcKsPt4c6pmq", "quantity": 1 }],
      "status": "PAID",
      "methods": ["CARD"],
      "customerId": "cust_def456",
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2025-01-06T19:59:57.819Z",
      "updatedAt": "2025-01-06T20:00:05.000Z"
    }
  }
}

## subscription.payment_failed
Disparado a cada falha de cobrança de um ciclo. O campo retryNumber indica quantas tentativas já foram feitas. Quando retryNumber atingir maxRetry (configurado em retryPolicy ao criar a assinatura), a assinatura é cancelada automaticamente e o evento subscription.cancelled é disparado logo em seguida com cancelledDueTo: "max_payment_retries_exceeded".

{
  "id": "log_abc123xyz",
  "event": "subscription.payment_failed",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "subscription": {
      "id": "subs_tAFqDWBhcEYTjQh2K0ZYDHau",
      "amount": 2990,
      "currency": "BRL",
      "method": "CARD",
      "status": "ACTIVE",
      "frequency": "MONTHLY",
      "retryPolicy": {
        "maxRetry": 3,
        "retryEvery": 2
      },
      "createdAt": "2024-12-06T20:00:00.000Z",
      "updatedAt": "2025-01-06T20:00:05.000Z",
      "canceledAt": null,
      "cancelPolicy": null,
      "cancelledDueTo": null
    },
    "installmentId": "intl_abc123xyz",
    "installmentNumber": 2,
    "retryNumber": 1
  }
}

## subscription.cancelled(manual)
Disparado quando uma assinatura é cancelada — seja via API ou automaticamente após esgotar todas as tentativas de cobrança. Nesse segundo caso, cancelledDueTo será "max_payment_retries_exceeded".

Campos extras **na raiz de `data`**: `changeSource`, `pendingUpdateId`, `productId`, `quantity`, `newAmount`,
`status`, `requestedAt`.

{
  "id": "log_abc123xyz",
  "event": "subscription.cancelled",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "subscription": {
      "id": "subs_tAFqDWBhcEYTjQh2K0ZYDHau",
      "amount": 2990,
      "currency": "BRL",
      "method": "CARD",
      "status": "CANCELLED",
      "frequency": "MONTHLY",
      "createdAt": "2024-12-06T20:00:00.000Z",
      "updatedAt": "2024-12-06T20:00:05.000Z",
      "canceledAt": "2024-12-06T20:00:05.000Z",
      "cancelPolicy": "NOW",
      "cancelledDueTo": null
    },
    "customer": {
      "id": "cust_def456",
      "name": "Maria Santos",
      "email": "maria@exemplo.com",
      "taxId": "12.***.***/0001-**"
    },
    "payment": {
      "id": "char_xyz789",
      "externalId": "pedido-456",
      "amount": 2990,
      "paidAmount": 2990,
      "platformFee": 100,
      "status": "PAID",
      "methods": ["CARD"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T20:00:00.000Z",
      "updatedAt": "2024-12-06T20:00:05.000Z"
    },
    "payerInformation": {
      "method": "CARD",
      "CARD": {
        "number": "1234",
        "brand": "VISA"
      }
    },
    "checkout": {
      "id": "bill_jskd3TMfScHZDJe5NSZjTmQ4",
      "externalId": null,
      "url": "https://app.abacatepay.com/pay/bill_jskd3TMfScHZDJe5NSZjTmQ4",
      "amount": 2990,
      "paidAmount": 2990,
      "platformFee": 100,
      "frequency": "SUBSCRIPTION",
      "items": [{ "id": "prod_bx4BstRWhQ2SUcKsPt4c6pmq", "quantity": 1 }],
      "status": "PAID",
      "methods": ["CARD"],
      "customerId": "cust_def456",
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T19:59:57.819Z",
      "updatedAt": "2024-12-06T20:00:05.000Z"
    }
  }
}

## subscription.cancelled(max retires)
Disparado quando todas as tentativas de cobrança são esgotadas. cancelledDueTo identifica a causa e cancelPolicy é "NOW", indicando que os ciclos futuros também foram cancelados.

{
  "id": "log_abc123xyz",
  "event": "subscription.cancelled",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "subscription": {
      "id": "subs_tAFqDWBhcEYTjQh2K0ZYDHau",
      "amount": 2990,
      "currency": "BRL",
      "method": "CARD",
      "status": "CANCELLED",
      "frequency": "MONTHLY",
      "retryPolicy": {
        "maxRetry": 3,
        "retryEvery": 2
      },
      "createdAt": "2024-12-06T20:00:00.000Z",
      "updatedAt": "2025-01-06T20:00:05.000Z",
      "canceledAt": "2025-01-06T20:00:05.000Z",
      "cancelPolicy": "NOW",
      "cancelledDueTo": "max_payment_retries_exceeded"
    },
    "customer": {
      "id": "cust_def456",
      "name": "Maria Santos",
      "email": "maria@exemplo.com",
      "taxId": "12.***.***/0001-**"
    }
  }
}