using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PDV.Application.DTOs.Payments;
using PDV.Application.Interfaces.Payments;

namespace PDV.Infrastructure.Services.Payments.AbacatePay;

// Valida autenticidade (secret na URL + HMAC-SHA256 do corpo raw) e traduz o payload para o
// modelo de domínio. Não toca no banco — é puro: entra rawBody, sai PaymentWebhookEvent.
public class AbacatePayWebhookProcessor(IOptions<AbacatePayOptions> options) : IPaymentWebhookProcessor
{
    private readonly AbacatePayOptions _options = options.Value;

    public string Provider => AbacatePayGateway.ProviderName;

    public bool VerifySecret(string? secretFromQuery)
    {
        if (string.IsNullOrEmpty(secretFromQuery) || string.IsNullOrEmpty(_options.WebhookSecret))
            return false;

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(secretFromQuery),
            Encoding.UTF8.GetBytes(_options.WebhookSecret));
    }

    public bool VerifySignature(string rawBody, string? signatureHeader)
    {
        if (string.IsNullOrEmpty(signatureHeader) || string.IsNullOrEmpty(_options.PublicApiKey))
            return false;

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.PublicApiKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBody));
        var expected = Convert.ToBase64String(hash);

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signatureHeader));
    }

    public PaymentWebhookEvent Parse(string rawBody)
    {
        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement;

        var rawType = TryGetString(root, "event") ?? "unknown";
        var data = root.TryGetProperty("data", out var d) ? d : default;

        return new PaymentWebhookEvent(
            Type: MapType(rawType),
            RawEventType: rawType,
            EventId: ComputeEventId(rawBody),
            ChargeId: TryGetString(data, "id"),
            SubscriptionId: TryGetString(data, "subscriptionId") ?? TryGetString(data, "subscription"),
            CustomerId: TryGetString(data, "customerId") ?? TryGetString(data, "customer"),
            Status: AbacatePayGateway.MapStatus(TryGetString(data, "status")),
            Metadata: ReadMetadata(data),
            AmountCents: TryGetInt(data, "amount") ?? TryGetInt(data, "paidAmount"),
            PaidAt: TryGetDate(data, "paidAt"),
            ReceiptUrl: TryGetString(data, "receiptUrl"));
    }

    private static PaymentWebhookType MapType(string e) => e switch
    {
        "checkout.completed" => PaymentWebhookType.CheckoutCompleted,
        "checkout.refunded" => PaymentWebhookType.CheckoutRefunded,
        "checkout.disputed" => PaymentWebhookType.CheckoutDisputed,
        "transparent.completed" => PaymentWebhookType.TransparentCompleted,
        "transparent.refunded" => PaymentWebhookType.TransparentRefunded,
        "transparent.disputed" => PaymentWebhookType.TransparentDisputed,
        "subscription.trial_started" => PaymentWebhookType.SubscriptionTrialStarted,
        "subscription.completed" => PaymentWebhookType.SubscriptionCompleted,
        "subscription.renewed" => PaymentWebhookType.SubscriptionRenewed,
        "subscription.cancelled" => PaymentWebhookType.SubscriptionCancelled,
        "subscription.plan_changed" => PaymentWebhookType.SubscriptionPlanChanged,
        _ => PaymentWebhookType.Unknown,
    };

    // AbacatePay não garante um id de evento estável — usamos o hash do corpo raw. Retentativas
    // enviam o mesmo corpo (mesmo hash) → idempotência; eventos diferentes têm corpos diferentes.
    private static string ComputeEventId(string rawBody) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawBody)));

    private static IReadOnlyDictionary<string, string> ReadMetadata(JsonElement data)
    {
        var result = new Dictionary<string, string>();
        if (data.ValueKind != JsonValueKind.Object) return result;
        if (!data.TryGetProperty("metadata", out var metadata) || metadata.ValueKind != JsonValueKind.Object)
            return result;

        foreach (var prop in metadata.EnumerateObject())
        {
            var value = prop.Value.ValueKind == JsonValueKind.String ? prop.Value.GetString() : prop.Value.GetRawText();
            if (value is not null) result[prop.Name] = value;
        }

        return result;
    }

    private static string? TryGetString(JsonElement element, string name)
    {
        if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(name, out var prop))
            return null;
        return prop.ValueKind == JsonValueKind.String ? prop.GetString() : null;
    }

    private static int? TryGetInt(JsonElement element, string name)
    {
        if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(name, out var prop))
            return null;
        return prop.ValueKind == JsonValueKind.Number && prop.TryGetInt32(out var value) ? value : null;
    }

    private static DateTime? TryGetDate(JsonElement element, string name)
    {
        if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(name, out var prop))
            return null;
        return prop.ValueKind == JsonValueKind.String && prop.TryGetDateTime(out var value) ? value : null;
    }
}
