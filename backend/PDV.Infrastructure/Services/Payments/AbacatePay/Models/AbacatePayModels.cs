using System.Text.Json;

namespace PDV.Infrastructure.Services.Payments.AbacatePay.Models;

// Envelope padrão da AbacatePay: { data, success, error }.
public record AbacateEnvelope<T>(T? Data, bool Success, JsonElement? Error);

// ---- customers/create : body flat (sem wrapper data) ----
public record CreateCustomerBody(string Email, string? Name, string? TaxId, string? Cellphone);
public record AbacateCustomer(string Id, string? Email, string? Name, string? TaxId, string? Cellphone);

// ---- checkouts comuns (subscriptions/create usa o mesmo shape, flat) ----
public record CheckoutItem(string Id, int Quantity);
public record CreateSubscriptionBody(
    List<CheckoutItem> Items,
    string CustomerId,
    string ExternalId,
    string[]? Methods,
    string[]? Coupons,
    string? ReturnUrl,
    string? CompletionUrl,
    Dictionary<string, string> Metadata);
public record AbacateCheckout(string Id, string? Url, int? Amount, string? Status);

// ---- transparents/create : body { method, data:{...} } ----
public record CreateTransparentBody(string Method, CreateTransparentData Data);
public record CreateTransparentData(
    int Amount,
    string? Description,
    int? ExpiresIn,
    TransparentCustomer? Customer,
    Dictionary<string, string> Metadata);
public record TransparentCustomer(string? Name, string? Email, string? TaxId, string? Cellphone);
public record AbacateTransparent(
    string Id,
    int? Amount,
    string? Status,
    string? BrCode,
    string? BrCodeBase64,
    DateTime? ExpiresAt);

// ---- subscriptions/change-plan ----
public record ChangePlanBody(string Id, string ProductId, int Quantity);
public record AbacatePlanChange(string Id, string? SubscriptionId, string? Status, string? ProductId, int? Quantity, int? NewAmount);

// ---- subscriptions/cancel ----
public record CancelSubscriptionBody(string Id);
public record AbacateSubscription(string Id, string? Status);

// ---- status (checkouts/get, transparents/check) ----
public record AbacateChargeStatus(string Id, string? Status);

// ---- products/get ----
public record AbacateProduct(string Id, string? ExternalId, string? Name, string? Description, int? Price, string? Status, string? Currency, bool DevMode, DateTime? CreatedAt, DateTime? UpdatedAt);
