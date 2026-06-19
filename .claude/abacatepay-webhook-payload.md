# checkout.completed

## PIX

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
      "platformFee": 80,
      "frequency": "ONE_TIME",
      "items": [{ "id": "prod_xyz", "quantity": 1 }],
      "status": "PAID",
      "methods": ["PIX"],
      "customerId": "cust_abc123",
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "installmentsCount": null,
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
      "method": "PIX",
      "PIX": {
        "name": "João Silva",
        "taxId": "123.***.***-**",
        "isSameAsCustomer": true
      }
    }
  }
}

## CARD

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

# checkout.disputed

## PIX

{
  "event": "checkout.disputed",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "checkout": {
      "id": "bill_abc123xyz",
      "externalId": "pedido-123",
      "url": "https://app.abacatepay.com/pay/bill_abc123xyz",
      "amount": 10000,
      "paidAmount": 10000,
      "platformFee": 80,
      "frequency": "ONE_TIME",
      "items": [{ "id": "prod_xyz", "quantity": 1 }],
      "status": "PAID",
      "methods": ["PIX"],
      "customerId": "cust_abc123",
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "installmentsCount": null,
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
      "method": "PIX",
      "PIX": {
        "name": "João Silva",
        "taxId": "123.***.***-**",
        "isSameAsCustomer": true
      }
    },
    "reason": "requested_by_customer"
  }
}

## CARD

{
  "event": "checkout.disputed",
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


checkout.refunded

## PIX

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
      "platformFee": 80,
      "frequency": "ONE_TIME",
      "items": [{ "id": "prod_xyz", "quantity": 1 }],
      "status": "PAID",
      "methods": ["PIX"],
      "customerId": "cust_abc123",
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "installmentsCount": null,
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
      "method": "PIX",
      "PIX": {
        "name": "João Silva",
        "taxId": "123.***.***-**",
        "isSameAsCustomer": true
      }
    },
    "reason": "requested_by_customer"
  }
} 
## CARD

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

# transparent.completed

## PIX

{
  "event": "transparent.completed",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "transparent": {
      "id": "char_xyz789",
      "externalId": "pedido-456",
      "amount": 5000,
      "paidAmount": 5000,
      "platformFee": 50,
      "status": "PAID",
      "frequency": "ONE_TIME",
      "devMode": true,
      "customerId": "cust_abc123",
      "methods": ["PIX"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T19:00:00.000Z",
      "updatedAt": "2024-12-06T19:00:05.000Z"
    },
    "customer": {
      "id": "cust_def456",
      "name": "Maria Santos",
      "email": "maria@exemplo.com",
      "taxId": "12.***.***/0001-**"
    },
    "payerInformation": {
      "method": "PIX",
      "PIX": {
        "name": "Maria Santos",
        "taxId": "12.***.***/0001-**",
        "isSameAsCustomer": true
      }
    }
  }
}

## card

{
  "event": "transparent.completed",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "transparent": {
      "id": "char_xyz789",
      "externalId": "pedido-456",
      "amount": 5000,
      "paidAmount": 5000,
      "platformFee": 78,
      "status": "PAID",
      "frequency": "ONE_TIME",
      "devMode": true,
      "customerId": "cust_abc123",
      "methods": ["CARD"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T19:00:00.000Z",
      "updatedAt": "2024-12-06T19:00:05.000Z"
    },
    "customer": {
      "id": "cust_def456",
      "name": "Maria Santos",
      "email": "maria@exemplo.com",
      "taxId": "12.***.***/0001-**"
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

# transparent.disputed

## PIX

{
  "event": "transparent.disputed",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "transparent": {
      "id": "char_xyz789",
      "externalId": "pedido-456",
      "amount": 5000,
      "paidAmount": 5000,
      "platformFee": 50,
      "status": "PAID",
      "frequency": "ONE_TIME",
      "devMode": true,
      "customerId": "cust_abc123",
      "methods": ["PIX"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T19:00:00.000Z",
      "updatedAt": "2024-12-06T19:00:05.000Z"
    },
    "customer": {
      "id": "cust_def456",
      "name": "Maria Santos",
      "email": "maria@exemplo.com",
      "taxId": "12.***.***/0001-**"
    },
    "payerInformation": {
      "method": "PIX",
      "PIX": {
        "name": "Maria Santos",
        "taxId": "12.***.***/0001-**",
        "isSameAsCustomer": true
      }
    },
    "reason": "requested_by_customer"
  }
}

## card

{
  "event": "transparent.disputed",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "transparent": {
      "id": "char_xyz789",
      "externalId": "pedido-456",
      "amount": 5000,
      "paidAmount": 5000,
      "platformFee": 78,
      "status": "PAID",
      "frequency": "ONE_TIME",
      "devMode": true,
      "customerId": "cust_abc123",
      "methods": ["CARD"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T19:00:00.000Z",
      "updatedAt": "2024-12-06T19:00:05.000Z"
    },
    "customer": {
      "id": "cust_def456",
      "name": "Maria Santos",
      "email": "maria@exemplo.com",
      "taxId": "12.***.***/0001-**"
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

# transparent.refunded

## PIX

{
  "event": "transparent.refunded",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "transparent": {
      "id": "char_xyz789",
      "externalId": "pedido-456",
      "amount": 5000,
      "paidAmount": 5000,
      "platformFee": 50,
      "status": "PAID",
      "frequency": "ONE_TIME",
      "devMode": true,
      "customerId": "cust_abc123",
      "methods": ["PIX"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T19:00:00.000Z",
      "updatedAt": "2024-12-06T19:00:05.000Z"
    },
    "customer": {
      "id": "cust_def456",
      "name": "Maria Santos",
      "email": "maria@exemplo.com",
      "taxId": "12.***.***/0001-**"
    },
    "payerInformation": {
      "method": "PIX",
      "PIX": {
        "name": "Maria Santos",
        "taxId": "12.***.***/0001-**",
        "isSameAsCustomer": true
      }
    },
    "reason": "requested_by_customer"
  }
}

## card

{
  "event": "transparent.refunded",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "transparent": {
      "id": "char_xyz789",
      "externalId": "pedido-456",
      "amount": 5000,
      "paidAmount": 5000,
      "platformFee": 78,
      "status": "PAID",
      "frequency": "ONE_TIME",
      "devMode": true,
      "customerId": "cust_abc123",
      "methods": ["CARD"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T19:00:00.000Z",
      "updatedAt": "2024-12-06T19:00:05.000Z"
    },
    "customer": {
      "id": "cust_def456",
      "name": "Maria Santos",
      "email": "maria@exemplo.com",
      "taxId": "12.***.***/0001-**"
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

# subscription.trial_started

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
      "canceledAt": null,
      "cancelPolicy": null,
      "cancelledDueTo": null
    },
    "customer": {
      "id": "cust_def456",
      "name": "Maria Santos",
      "email": "maria@exemplo.com",
      "taxId": "12.***.***/0001-**"
    }
  }
}

# subscription.completed

## PIX

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
      "method": "PIX",
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
      "platformFee": 60,
      "status": "PAID",
      "methods": ["PIX"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T20:00:00.000Z",
      "updatedAt": "2024-12-06T20:00:05.000Z"
    },
    "payerInformation": {
      "method": "PIX",
      "PIX": {
        "name": "Maria Santos",
        "taxId": "12.***.***/0001-**",
        "isSameAsCustomer": true
      }
    },
    "checkout": {
      "id": "bill_jskd3TMfScHZDJe5NSZjTmQ4",
      "externalId": null,
      "url": "https://app.abacatepay.com/pay/bill_jskd3TMfScHZDJe5NSZjTmQ4",
      "amount": 2990,
      "paidAmount": 2990,
      "platformFee": 60,
      "frequency": "SUBSCRIPTION",
      "items": [{ "id": "prod_bx4BstRWhQ2SUcKsPt4c6pmq", "quantity": 1 }],
      "status": "PAID",
      "methods": ["PIX"],
      "customerId": "cust_def456",
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T19:59:57.819Z",
      "updatedAt": "2024-12-06T20:00:05.000Z"
    }
  }
}

## CARD

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

# subscription.renewed

## PIX

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
      "method": "PIX",
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
      "platformFee": 60,
      "status": "PAID",
      "methods": ["PIX"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2025-01-06T20:00:00.000Z",
      "updatedAt": "2025-01-06T20:00:05.000Z"
    },
    "payerInformation": {
      "method": "PIX",
      "PIX": {
        "name": "Maria Santos",
        "taxId": "12.***.***/0001-**",
        "isSameAsCustomer": true
      }
    },
    "checkout": {
      "id": "bill_renewxyz789",
      "externalId": null,
      "url": "https://app.abacatepay.com/pay/bill_renewxyz789",
      "amount": 2990,
      "paidAmount": 2990,
      "platformFee": 60,
      "frequency": "SUBSCRIPTION",
      "items": [{ "id": "prod_bx4BstRWhQ2SUcKsPt4c6pmq", "quantity": 1 }],
      "status": "PAID",
      "methods": ["PIX"],
      "customerId": "cust_def456",
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2025-01-06T19:59:57.819Z",
      "updatedAt": "2025-01-06T20:00:05.000Z"
    }
  }
}

## CARD

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

# subscription.cancelled

## PIX

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
      "method": "PIX",
      "status": "CANCELLED",
      "frequency": "MONTHLY",
      "createdAt": "2024-12-06T20:00:00.000Z",
      "updatedAt": "2024-12-06T20:00:05.000Z",
      "canceledAt": "2024-12-06T20:00:05.000Z",
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
      "platformFee": 60,
      "status": "PAID",
      "methods": ["PIX"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T20:00:00.000Z",
      "updatedAt": "2024-12-06T20:00:05.000Z"
    },
    "payerInformation": {
      "method": "PIX",
      "PIX": {
        "name": "Maria Santos",
        "taxId": "12.***.***/0001-**",
        "isSameAsCustomer": true
      }
    },
    "checkout": {
      "id": "bill_jskd3TMfScHZDJe5NSZjTmQ4",
      "externalId": null,
      "url": "https://app.abacatepay.com/pay/bill_jskd3TMfScHZDJe5NSZjTmQ4",
      "amount": 2990,
      "paidAmount": 2990,
      "platformFee": 60,
      "frequency": "SUBSCRIPTION",
      "items": [{ "id": "prod_bx4BstRWhQ2SUcKsPt4c6pmq", "quantity": 1 }],
      "status": "PAID",
      "methods": ["PIX"],
      "customerId": "cust_def456",
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2024-12-06T19:59:57.819Z",
      "updatedAt": "2024-12-06T20:00:05.000Z"
    }
  }
}

## CARD

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


