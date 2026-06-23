using System.Text.Json;
using System.Text.Json.Serialization;

namespace PDV.Infrastructure.Services.Payments.AbacatePay.Models;

// ---------------------------------------------------------------------------
// Envelope raiz
// ---------------------------------------------------------------------------

// { id?, event, apiVersion, devMode, data }
// id (log_...) só existe em eventos subscription.*; checkout/transparent não têm.
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
//   checkout, customer, payerInformation  → sempre (6/6)
//   subscription, payment                 → ausentes no checkout.completed (5/6)
//   transparent                           → exclusivo de eventos transparent.*
//   campos extras na raiz (ProductId...)  → exclusivos de subscription.plan_changed
public record WebhookData(
    WebhookCheckout? Checkout,
    WebhookTransparent? Transparent,
    WebhookSubscription? Subscription,
    WebhookPayment? Payment,
    WebhookCustomer? Customer,
    WebhookPayerInformation? PayerInformation,

    // Exclusivos de subscription.plan_changed — ficam na raiz de data, fora de qualquer sub-objeto
    string? PendingUpdateId,
    string? ProductId,
    int? NewAmount,
    string? ChangeSource,
    string? Status,        // Status da atualização pendente ("PENDING")
    DateTime? RequestedAt,
    int? Quantity
);

// ---------------------------------------------------------------------------
// data.checkout
// ---------------------------------------------------------------------------

// Presente em todos os eventos com o mesmo shape.
//
// Variações documentadas:
//   amount      = 0 no checkout.completed de fluxos trial (nenhuma cobrança)
//   externalId  = null no sub.completed e sub.renewed (checkout gerado internamente)
//   paidAmount  = null até haver cobrança real; preenchido no plan_changed, sub.completed, sub.renewed
//   status      = PENDING nos eventos de trial/trial; PAID quando há cobrança real
//   receiptUrl  = null até sub.completed / sub.renewed
//   trialDays, trialEndsAt, nextChargeAt = presentes apenas no checkout.completed
//   utms        = presente nos primeiros 4 eventos; ausente no sub.completed e sub.renewed
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
    int? TrialDays,
    DateTime? TrialEndsAt,
    DateTime? NextChargeAt,
    WebhookUtms? Utms
);

public record WebhookCheckoutCard(int MaxInstallments);

public record WebhookItem(string Id, int Quantity);

// ---------------------------------------------------------------------------
// data.subscription
// ---------------------------------------------------------------------------

// Ausente no checkout.completed; presente nos demais 5 eventos.
//
// Variações:
//   status      = "ACTIVE" na maioria; "CANCELLED" apenas no subscription.cancelled
//   canceledAt, cancelPolicy = preenchidos somente no subscription.cancelled
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
    string? CancelledDueTo
);

// ---------------------------------------------------------------------------
// data.payment
// ---------------------------------------------------------------------------

// Ausente no checkout.completed; presente nos demais 5 eventos.
//
// O prefixo do id muda conforme o contexto:
//   card_  → tokenização sem débito (trial_started, cancelled)
//   char_  → cobrança real (plan_changed, sub.completed, sub.renewed)
//
// Variações:
//   status      = "APPROVED" (tokenização); "PAID" (dinheiro debitado)
//   paidAmount  = null no trial; preenchido quando há cobrança real
//   platformFee = ausente nos eventos de trial
//   receiptUrl  = null no trial; preenchido no sub.completed e sub.renewed
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

// ---------------------------------------------------------------------------
// data.transparent
// ---------------------------------------------------------------------------

// Exclusivo de eventos transparent.* (PIX / boleto).
// Shape análogo ao checkout — mutuamente exclusivos por família de evento.
public record WebhookTransparent(
    string Id,
    string? ExternalId,
    int Amount,
    int? PaidAmount,
    string Status,
    string? ReceiptUrl,
    Dictionary<string, JsonElement>? Metadata,
    DateTime CreatedAt,
    DateTime UpdatedAt
);