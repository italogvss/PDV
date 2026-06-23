# Fluxo inscrição com trial days
1. POST -> subscriptions/create

Resposta:

{
    "success": true,
    "data": {
        "id": "bill_rPMZeD4eJcmSPKwMzZW3LLWF",
        "externalId": "subs-12",
        "url": "https://app.abacatepay.com/pay/bill_rPMZeD4eJcmSPKwMzZW3LLWF",
        "amount": 3000,
        "paidAmount": null, // null pois não há cobrança no trial
        "platformFee": 100,
        "items": [
            {
                "id": "prod_WjdNGNcB11RNXfbNmtNkqQ1N",
                "quantity": 1
            }
        ],
        "status": "PENDING",
        "methods": [
            "CARD"
        ],
        "frequency": "SUBSCRIPTION",
        "coupons": [],
        "devMode": true,
        "customerId": "cust_aJ2GbrULKW3fqMU3ffrXr35P",
        "returnUrl": null,
        "completionUrl": "https://seusite.com/sucesso",
        "receiptUrl": null,
        "metadata": null,
        "createdAt": "2026-06-19T19:52:51.656Z",
        "updatedAt": "2026-06-19T19:52:51.656Z",
        "trialDays": 30,
        "trialEndsAt": "2026-07-19T23:59:59.999Z",
        "nextChargeAt": "2026-07-19T23:59:59.999Z",
        "card": {
            "maxInstallments": 1
        },
        "upSellProductId": null,
        "installmentsCount": null
    },
    "error": null
}

2. webhook recebe dois eventos checkout.complete e subscription.trial_started

payload do checkout.complete:

{
  "event": "checkout.completed",
  "apiVersion": 2,
  "devMode": true,
  "data": {
    "checkout": {
      "id": "bill_rPMZeD4eJcmSPKwMzZW3LLWF",
      "externalId": "subs-12",
      "url": "https://app.abacatepay.com/pay/bill_rPMZeD4eJcmSPKwMzZW3LLWF",
      "amount": 0,
      "paidAmount": null, //null pois é trialdays vai apenas criar o token para o pagamento que só vai ser efetuado ao final do trialdays
      "platformFee": 100,
      "items": [
        {
          "id": "prod_WjdNGNcB11RNXfbNmtNkqQ1N",
          "quantity": 1
        }
      ],
      "status": "PENDING",
      "methods": [
        "CARD"
      ],
      "frequency": "SUBSCRIPTION",
      "coupons": [],
      "devMode": true,
      "customerId": "cust_aJ2GbrULKW3fqMU3ffrXr35P",
      "returnUrl": null,
      "completionUrl": "https://seusite.com/sucesso",
      "receiptUrl": null,
      "metadata": null,
      "createdAt": "2026-06-19T19:52:51.656Z",
      "updatedAt": "2026-06-19T19:52:51.656Z",
      "trialDays": 30,
      "trialEndsAt": "2026-07-19T23:59:59.999Z",
      "nextChargeAt": "2026-07-19T23:59:59.999Z",
      "card": {
        "maxInstallments": 1
      },
      "upSellProductId": null,
      "installmentsCount": null,
      "utms": {
        "source": null,
        "medium": null,
        "campaign": null,
        "term": null,
        "content": null
      }
    },
    "customer": {
      "id": "cust_aJ2GbrULKW3fqMU3ffrXr35P",
      "name": "Italo Gavassi",
      "email": "italo.gavassi@gmail.com",
      "taxId": null
    },
    "payerInformation": {
      "method": "CARD",
      "utms": {
        "source": null,
        "medium": null,
        "campaign": null,
        "term": null,
        "content": null
      },
      "CARD": { //precisa salvar essas informações no historico de cobrança
        "number": "4242",
        "brand": "visa"
      }
    }
  }
}

Payload do subscription.trial_days

{
  "event": "subscription.trial_started",
  "apiVersion": 2,
  "devMode": true,
  "data": {
    "subscription": {
      "id": "subs_M0KEWLHBzQjSg2myU5hckNFR",
      "amount": 3000,
      "currency": "BRL",
      "method": "CARD",
      "status": "ACTIVE",
      "frequency": "MONTHLY",
      "createdAt": "2026-06-19T19:53:15.836Z",
      "updatedAt": "2026-06-19T19:53:15.836Z",
      "canceledAt": null,
      "cancelPolicy": null,
      "cancelledDueTo": null
    },
    "customer": {
      "id": "cust_AAda3uUtkDC5NYUxyFzrJzcR",
      "name": "Italo Gavassi",
      "email": "italo.gavassi@gmail.com",
      "taxId": "109.***.269-**"
    },
    "checkout": {
      "id": "bill_rPMZeD4eJcmSPKwMzZW3LLWF",
      "externalId": "subs-12",
      "url": "https://app.abacatepay.com/pay/bill_rPMZeD4eJcmSPKwMzZW3LLWF",
      "amount": 3000,
      "paidAmount": null, //ainda é trial_days
      "platformFee": 100,
      "frequency": "SUBSCRIPTION",
      "items": [
        {
          "id": "prod_WjdNGNcB11RNXfbNmtNkqQ1N",
          "quantity": 1
        }
      ],
      "status": "PENDING",
      "methods": [
        "CARD"
      ],
      "customerId": "cust_aJ2GbrULKW3fqMU3ffrXr35P",
      "receiptUrl": null,
      "metadata": null,
      "createdAt": "2026-06-19T19:52:51.656Z",
      "updatedAt": "2026-06-19T19:52:51.656Z",
      "utms": {
        "source": null,
        "medium": null,
        "campaign": null,
        "term": null,
        "content": null
      }
    },
    "payment": {
      "id": "card_NSW4CWbUqHMwaaRffZThpUBd",
      "externalId": "subs-12",
      "amount": 0,
      "paidAmount": null,
      "status": "APPROVED",
      "methods": [
        "CARD"
      ],
      "receiptUrl": null,
      "createdAt": "2026-06-19T19:53:15.758Z",
      "updatedAt": "2026-06-19T19:53:15.758Z"
    },
    "payerInformation": {
      "method": "CARD",
      "utms": {
        "source": null,
        "medium": null,
        "campaign": null,
        "term": null,
        "content": null
      },
      "CARD": {
        "number": "4242",
        "brand": "visa"
      }
    }
  }
}

4. ao chegar a data final do tryal days e for feito a cobrança, chegara um evento checkout.completed no webhook. esse evento é enviado sempre que a assinatura renova


## Fluxo de cancelamento de assinatura em trial

POST -> subscriptions/cancel

Resposta:

{
    "success": true,
    "data": {
        "id": "subs_M0KEWLHBzQjSg2myU5hckNFR",
        "customerId": "cust_AAda3uUtkDC5NYUxyFzrJzcR",
        "amount": 3000,
        "status": "CANCELLED",
        "method": "CARD",
        "coupons": [],
        "devMode": true,
        "createdAt": "2026-06-19T19:53:15.836Z",
        "updatedAt": "2026-06-19T19:53:15.836Z",
        "trialDays": 30,
        "trialEndsAt": "2026-07-19T23:59:59.999Z", //o plano continua ate o trialendat
        "retryPolicy": {
            "maxRetry": 3,
            "retryEvery": 1
        }
    },
    "error": null
}

o webhook envia um evento subscription.cancelled com a resposta:

{
  "event": "subscription.cancelled",
  "apiVersion": 2,
  "devMode": true,
  "data": {
    "subscription": {
      "id": "subs_M0KEWLHBzQjSg2myU5hckNFR",
      "amount": 3000,
      "currency": "BRL",
      "method": "CARD",
      "status": "CANCELLED",
      "frequency": "MONTHLY",
      "createdAt": "2026-06-19T19:53:15.836Z",
      "updatedAt": "2026-06-19T19:53:15.836Z",
      "canceledAt": "2026-06-19T20:06:45.377Z",
      "cancelPolicy": "NOW",
      "cancelledDueTo": null
    },
    "customer": {
      "id": "cust_AAda3uUtkDC5NYUxyFzrJzcR",
      "name": "Italo Gavassi",
      "email": "italo.gavassi@gmail.com",
      "taxId": "109.***.269-**"
    },
    "checkout": {
      "id": "bill_rPMZeD4eJcmSPKwMzZW3LLWF",
      "externalId": "subs-12",
      "url": "https://app.abacatepay.com/pay/bill_rPMZeD4eJcmSPKwMzZW3LLWF",
      "amount": 3000,
      "paidAmount": null,
      "platformFee": 100,
      "frequency": "SUBSCRIPTION",
      "items": [
        {
          "id": "prod_WjdNGNcB11RNXfbNmtNkqQ1N",
          "quantity": 1
        }
      ],
      "status": "PENDING",
      "methods": [
        "CARD"
      ],
      "customerId": "cust_aJ2GbrULKW3fqMU3ffrXr35P",
      "receiptUrl": null,
      "metadata": null,
      "createdAt": "2026-06-19T19:52:51.656Z",
      "updatedAt": "2026-06-19T19:52:51.656Z",
      "utms": {
        "source": null,
        "medium": null,
        "campaign": null,
        "term": null,
        "content": null
      }
    },
    "payment": {
      "id": "card_NSW4CWbUqHMwaaRffZThpUBd",
      "externalId": "subs-12",
      "amount": 0,
      "paidAmount": null,
      "status": "APPROVED",
      "methods": [
        "CARD"
      ],
      "receiptUrl": null,
      "createdAt": "2026-06-19T19:53:15.758Z",
      "updatedAt": "2026-06-19T19:53:15.758Z"
    },
    "payerInformation": {
      "method": "CARD",
      "utms": {
        "source": null,
        "medium": null,
        "campaign": null,
        "term": null,
        "content": null
      },
      "CARD": {
        "number": "4242",
        "brand": "visa"
      }
    }
  }
}

se o plano estiver em trialdays, eles são mantidos até o final, mas não vai haver cobrança.
se o plano já estiver ativo e não em trialdays ele continua ate a data de renovação

# Fluxo mudança de plano

POST -> subscription/change-plan

Retorna um objeto de atualização pendente (status: "PENDING"). A mudança é aplicada automaticamente no início do próximo ciclo.

Retorno

{
  "data": {
    "id": "subu_abc123xyz",
    "subscriptionId": "subs_abc123xyz",
    "status": "PENDING",
    "productId": "prod_plano_pro",
    "quantity": 1,
    "newAmount": 4990,
    "requestedAt": "2024-12-06T20:05:00.000Z"
  },
  "success": true,
  "error": null
}

e o webhook envia um evento subscription.plan_changed

{
  "event": "subscription.plan_changed",
  "apiVersion": 2,
  "devMode": true,
  "data": {
    "subscription": {
      "id": "subs_AZXCcsPN6HZhrHE0jDaBQd3u",
      "amount": 3500,
      "currency": "BRL",
      "method": "CARD",
      "status": "ACTIVE",
      "frequency": "MONTHLY",
      "createdAt": "2026-06-18T15:09:05.761Z",
      "updatedAt": "2026-06-18T15:09:05.761Z",
      "canceledAt": null,
      "cancelPolicy": null,
      "cancelledDueTo": null
    },
    "customer": {
      "id": "cust_AAda3uUtkDC5NYUxyFzrJzcR",
      "name": "Italo Gavassi",
      "email": "italo.gavassi@gmail.com",
      "taxId": "109.***.269-**"
    },
    "checkout": {
      "id": "bill_Nth3KyGuDPEheUeuhBU1Aw3H",
      "externalId": "0a50d090-2eca-4963-8e92-ca32194579d5",
      "url": "https://app.abacatepay.com/pay/bill_Nth3KyGuDPEheUeuhBU1Aw3H",
      "amount": 3500,
      "paidAmount": 3500,
      "platformFee": 183,
      "frequency": "SUBSCRIPTION",
      "items": [
        {
          "id": "prod_zC14fd6YWKx6cBshGhexD1Sp",
          "quantity": 1
        }
      ],
      "status": "PAID",
      "methods": [
        "CARD"
      ],
      "customerId": "cust_H3zs20tkSZFbETQBgyQBrX3q",
      "receiptUrl": null,
      "metadata": null,
      "createdAt": "2026-06-18T15:08:53.424Z",
      "updatedAt": "2026-06-18T15:09:05.636Z",
      "utms": {
        "source": null,
        "medium": null,
        "campaign": null,
        "term": null,
        "content": null
      }
    },
    "payment": {
      "id": "card_MxcN5q4FzsnRmaer3PATgxKh",
      "externalId": "0a50d090-2eca-4963-8e92-ca32194579d5",
      "amount": 3500,
      "paidAmount": 3500,
      "platformFee": 183,
      "status": "APPROVED",
      "methods": [
        "CARD"
      ],
      "receiptUrl": null,
      "createdAt": "2026-06-18T15:09:05.595Z",
      "updatedAt": "2026-06-18T15:09:05.595Z"
    },
    "payerInformation": {
      "method": "CARD",
      "utms": {
        "source": null,
        "medium": null,
        "campaign": null,
        "term": null,
        "content": null
      },
      "CARD": {
        "number": "4242",
        "brand": "visa"
      }
    },
    "changeSource": "API_CHANGE_PLAN",
    "pendingUpdateId": "subu_tXwgt01XDQCeBx4kszsSsXru",
    "productId": "prod_uwUHpTew3Xe6sYgJKsHdLSey",
    "quantity": 1,
    "newAmount": 5000,
    "status": "PENDING",
    "requestedAt": "2026-06-19T20:49:06.440Z"
  }
}

se assinatura fora de trial days, apenas muda a assinatura e atualiza informações de pagamento
se assinatura dentro de trialdays, muda o plano mas não muda a data final do trial days.
