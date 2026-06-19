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

    // Chave pública fixa do AbacatePay — igual para todos os usuários, documentada em
    // https://abacatepay.com/docs/webhooks/security
    private const string AbacatePayHmacKey =
        "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

    public bool VerifySignature(string rawBody, string? signatureHeader)
    {
        if (string.IsNullOrEmpty(signatureHeader))
            return false;

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(AbacatePayHmacKey));
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

        // O nó da cobrança ("charge") tem o mesmo shape em checkout/transparent/payment; ele só muda
        // de lugar conforme a família do evento. A identidade da assinatura (subs_) e o cliente (cust_)
        // ficam sempre em data.subscription / data.customer.
        var charge = SelectChargeNode(data, rawType);

        return new PaymentWebhookEvent(
            Type: MapType(rawType),
            Provider: Provider,
            RawEventType: rawType,
            EventId: ComputeEventId(root, rawBody),
            ChargeId: TryGetString(charge, "id"),
            ExternalId: TryGetString(charge, "externalId"),
            SubscriptionId: data.TryGetProperty("subscription", out var sub) ? TryGetString(sub, "id") : null,
            CustomerId: TryGetString(charge, "customerId")
                ?? (data.TryGetProperty("customer", out var cust) ? TryGetString(cust, "id") : null),
            Status: AbacatePayGateway.MapStatus(TryGetString(charge, "status")),
            Metadata: ReadMetadata(charge),
            AmountCents: TryGetInt(charge, "amount") ?? TryGetInt(charge, "paidAmount"),
            // Nenhum payload traz "paidAt"; usamos "updatedAt" (momento em que ficou PAID).
            PaidAt: TryGetDate(charge, "paidAt") ?? TryGetDate(charge, "updatedAt"),
            ReceiptUrl: TryGetString(charge, "receiptUrl"));
    }

    // checkout.*   → data.checkout (bill_)
    // transparent.* → data.transparent (pix_char_)
    // subscription.* → data.payment (char_) ou data.checkout — info de pagamento da cobrança recorrente
    private static JsonElement SelectChargeNode(JsonElement data, string rawType)
    {
        if (data.ValueKind != JsonValueKind.Object) return data;

        var family = rawType.Split('.', 2)[0];
        var keys = family switch
        {
            "checkout" => new[] { "checkout" },
            "transparent" => new[] { "transparent" },
            "subscription" => new[] { "payment", "checkout" },
            _ => new[] { "checkout", "transparent", "payment" },
        };

        foreach (var key in keys)
            if (data.TryGetProperty(key, out var node) && node.ValueKind == JsonValueKind.Object)
                return node;

        return data;
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

    // Eventos subscription.* trazem um id estável no root ("log_..."); usamos ele para idempotência.
    // Os demais (checkout/transparent) não têm id de evento — caímos no hash do corpo raw (retentativas
    // com o mesmo corpo geram o mesmo hash; eventos diferentes têm corpos diferentes).
    private static string ComputeEventId(JsonElement root, string rawBody) =>
        TryGetString(root, "id") ?? Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawBody)));

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
