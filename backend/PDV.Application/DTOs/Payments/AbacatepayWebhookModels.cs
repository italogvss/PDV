using System.Text.Json;
using System.Text.Json.Serialization;

namespace PDV.Infrastructure.Services.Payments.AbacatePay.Models;

// ---------------------------------------------------------------------------
// Envelope raiz
// ---------------------------------------------------------------------------

// { id?, event, apiVersion, devMode, data }
// id (log_...) só existe em eventos subscription.*; checkout não tem.
public record WebhookEnvelope(
    string? Id,
    string Event,
    int ApiVersion,
    bool DevMode,
    WebhookData? Data
);

// ---------------------------------------------------------------------------
// data{}
// ---------------------------------------------------------------------------

// Seções presentes por família de evento:
//   checkout, customer, payerInformation  → sempre, EXCETO em subscription.payment_failed e no
//                                           subscription.cancelled por max_payment_retries_exceeded
//   subscription, payment                 → ausentes no checkout.completed
//   installmentId/retryNumber             → exclusivos de subscription.payment_failed
public record WebhookData(
    WebhookCheckout? Checkout,
    WebhookSubscription? Subscription,
    WebhookPayment? Payment,
    WebhookCustomer? Customer,
    WebhookPayerInformation? PayerInformation,

    // Exclusivos de subscription.payment_failed — na raiz de data, fora de qualquer sub-objeto
    string? InstallmentId,     // intl_... — identifica a parcela recusada
    int? InstallmentNumber,
    int? RetryNumber           // tentativa atual; ao atingir subscription.retryPolicy.maxRetry
                               // o gateway cancela e envia subscription.cancelled
);

// ---------------------------------------------------------------------------
// data.checkout
// ---------------------------------------------------------------------------

// Presente em todos os eventos com o mesmo shape.
//
// Variações documentadas:
//   externalId  = null no sub.completed e sub.renewed (checkout gerado internamente)
//   paidAmount  = null até haver cobrança real; preenchido no sub.completed e sub.renewed
//   status      = PENDING enquanto não há cobrança real; PAID quando o dinheiro foi debitado
//   receiptUrl  = null até sub.completed / sub.renewed
//   nextChargeAt = fim do período custeado por esta cobrança, quando o gateway o informa
//   utms        = ausente no sub.completed e sub.renewed
public record WebhookCheckout(
    string Id,
    string? ExternalId,
    string? Url,
    int Amount,
    int? PaidAmount,
    int? PlatformFee,
    string? Frequency,
    List<WebhookItem>? Items,
    string Status,             // "PENDING" | "PAID"
    List<string>? Methods,
    List<string>? Coupons,
    string? CustomerId,        // Pode divergir de customer.id — não é o ID canônico
    string? ReceiptUrl,
    string? ReturnUrl,
    string? CompletionUrl,
    string? UpSellProductId,
    int? InstallmentsCount,
    WebhookCheckoutCard? Card, // { maxInstallments } — configuração do checkout, não dados do pagador
    Dictionary<string, JsonElement>? Metadata,
    bool DevMode,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? NextChargeAt,
    WebhookUtms? Utms
);

public record WebhookCheckoutCard(int MaxInstallments);

public record WebhookItem(string Id, int Quantity);

// ---------------------------------------------------------------------------
// data.subscription
// ---------------------------------------------------------------------------

// Ausente no checkout.completed; presente nos demais eventos.
//
// Variações:
//   status         = "ACTIVE" na maioria; "CANCELLED" apenas no subscription.cancelled
//   updatedAt      = quando o gateway processou o evento — âncora do período (nunca o relógio local)
//   canceledAt, cancelPolicy = preenchidos somente no subscription.cancelled
//   cancelledDueTo = "max_payment_retries_exceeded" quando o cancelamento foi involuntário
//   retryPolicy    = presente no payment_failed e no cancelled por esgotamento de tentativas
public record WebhookSubscription(
    string Id,
    int Amount,
    string Currency,
    string Method,
    string Status,         // "ACTIVE" | "CANCELLED"
    string Frequency,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? CanceledAt,
    string? CancelPolicy,  // "NOW" no subscription.cancelled
    string? CancelledDueTo,
    WebhookRetryPolicy? RetryPolicy
);

// Política de retentativa da cobrança recorrente, definida ao criar a assinatura.
public record WebhookRetryPolicy(int MaxRetry, int RetryEvery);

// ---------------------------------------------------------------------------
// data.payment
// ---------------------------------------------------------------------------

// Ausente no checkout.completed; presente nos demais eventos que carregam cobrança.
//
// O prefixo do id muda conforme o contexto:
//   card_  → tokenização sem débito (cancelled)
//   char_  → cobrança real (sub.completed, sub.renewed)
//
// Variações:
//   status      = "APPROVED" (tokenização); "PAID" (dinheiro debitado)
//   paidAmount  = null enquanto não há cobrança real
//   receiptUrl  = preenchido no sub.completed e sub.renewed
public record WebhookPayment(
    string Id,
    string? ExternalId,
    int Amount,
    int? PaidAmount,
    int? PlatformFee,
    string Status,     // "APPROVED" | "PAID"
    List<string>? Methods,
    string? ReceiptUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

// ---------------------------------------------------------------------------
// data.customer
// ---------------------------------------------------------------------------

// Presente em todos os eventos.
// Id é o identificador canônico do cliente — usar sempre este,
// e não checkout.customerId, que pode divergir (inconsistência documentada da API).
public record WebhookCustomer(
    string Id,
    string Name,
    string Email,
    string? TaxId
);

// ---------------------------------------------------------------------------
// data.payerInformation
// ---------------------------------------------------------------------------

// Presente em todos os eventos.
// utms ausente no sub.completed e sub.renewed.
// A chave "CARD" em JSON é maiúscula — JsonPropertyName garante o bind correto.
public record WebhookPayerInformation(
    string Method,
    [property: JsonPropertyName("CARD")] WebhookCard? Card,
    WebhookUtms? Utms
);

// Dados do cartão do pagador: number = últimos 4 dígitos.
public record WebhookCard(string Number, string Brand);

public record WebhookUtms(
    string? Source,
    string? Medium,
    string? Campaign,
    string? Term,
    string? Content
);