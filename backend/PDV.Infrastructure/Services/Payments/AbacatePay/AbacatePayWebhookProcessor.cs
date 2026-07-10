using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PDV.Application.DTOs.Payments;
using PDV.Application.Interfaces.Payments;
using PDV.Infrastructure.Services.Payments.AbacatePay.Models;

namespace PDV.Infrastructure.Services.Payments.AbacatePay;

// Valida autenticidade (secret na URL + HMAC-SHA256 do corpo raw) e traduz o payload para o
// modelo de domínio. Não toca no banco — é puro: entra rawBody, sai PaymentWebhookEvent.
public class AbacatePayWebhookProcessor(IOptions<AbacatePayOptions> options) : IPaymentWebhookProcessor
{
    private readonly AbacatePayOptions _options = options.Value;

    public string Provider => AbacatePayGateway.ProviderName;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

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
        var hash     = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBody));
        var expected = Convert.ToBase64String(hash);

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signatureHeader));
    }

    public PaymentWebhookEvent Parse(string rawBody)
    {
        // Fase 1 — deserialização: rawBody → estrutura tipada
        var payload = ParsePayload(rawBody);

        // Fase 2 — mapeamento: estrutura tipada → PaymentWebhookEvent
        return MapToEvent(payload, rawBody);
    }

    private static WebhookEnvelope ParsePayload(string rawBody) =>
        JsonSerializer.Deserialize<WebhookEnvelope>(rawBody, JsonOptions)
        ?? throw new JsonException("Payload inválido: corpo nulo ou mal formado.");

    private PaymentWebhookEvent MapToEvent(WebhookEnvelope payload, string rawBody)
    {
        var data     = payload.Data;
        var checkout = data?.Checkout;
        var payment  = data?.Payment;
        var sub      = data?.Subscription;
        var customer = data?.Customer;
        var card     = data?.PayerInformation?.Card;

        // ---- EventId -------------------------------------------------------
        // subscription.* trazem id estável (log_...) — usado para idempotência.
        // checkout.* não têm id de evento: hash do corpo garante
        // que retentativas com mesmo corpo colidam, e eventos distintos não colidam.
        var eventId = payload.Id
            ?? Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawBody)));

        // ---- ChargeId ------------------------------------------------------
        // Sempre o bill_ do checkout.
        // O payment.id (card_ / char_) é o ID da transação do cartão — diferente do billing.
        var chargeId = checkout?.Id;

        // ---- ExternalId ----------------------------------------------------
        // checkout.externalId é null no sub.completed e sub.renewed porque o checkout é
        // gerado internamente pela plataforma nesses casos.
        // payment.externalId carrega o valor nesses eventos.
        var externalId = checkout?.ExternalId
                      ?? payment?.ExternalId;

        // ---- AmountCents ---------------------------------------------------
        // paidAmount = valor efetivamente debitado (null enquanto não há cobrança real).
        // amount     = valor nominal do plano.
        //
        // Cascata: checkout.paidAmount → payment.paidAmount → checkout.amount → subscription.amount.
        // O último degrau cobre subscription.payment_failed, que não traz nó `checkout` — o valor
        // recusado é o da assinatura.
        var amountCents = checkout?.PaidAmount
                       ?? payment?.PaidAmount
                       ?? checkout?.Amount
                       ?? sub?.Amount;

        // ---- Status --------------------------------------------------------
        // subscription.status é CANCELLED no evento cancelled;
        // checkout.status é PENDING nesse mesmo evento — seria o valor errado.
        // Para todos os outros eventos, checkout.status (PENDING / PAID) é o sinal
        // correto do estado do billing.
        var statusRaw = sub?.Status == "CANCELLED"
            ? "CANCELLED"
            : checkout?.Status;

        // ---- PaidAt --------------------------------------------------------
        // Só tem sentido quando houve cobrança real (checkout.status = "PAID").
        var paidAt = checkout?.Status == "PAID" ? checkout.UpdatedAt : (DateTime?)null;

        // ---- ReceiptUrl ----------------------------------------------------
        // Aparece em ambos os nós (checkout e payment) apenas no sub.completed e sub.renewed.
        var receiptUrl = checkout?.ReceiptUrl
                      ?? payment?.ReceiptUrl;

        // ---- CustomerId ----------------------------------------------------
        // customer.id é o ID canônico do cliente.
        // checkout.customerId pode divergir de customer.id — inconsistência documentada
        // da API; nunca usá-lo como primário.
        var customerId = customer?.Id ?? checkout?.CustomerId;

        // ---- Metadata ------------------------------------------------------
        // Presente no checkout; valores JSON não-string viram raw text
        // para preservar o comportamento original sem perda de informação.
        var metadataSource = checkout?.Metadata;
        var metadata = metadataSource?.ToDictionary(
            kv => kv.Key,
            kv => kv.Value.ValueKind == JsonValueKind.String
                ? kv.Value.GetString() ?? ""
                : kv.Value.GetRawText()
        ) ?? new Dictionary<string, string>();

        return new PaymentWebhookEvent(
            Type:                  MapType(payload.Event),
            Provider:              Provider,
            RawEventType:          payload.Event,
            EventId:               eventId,
            ChargeId:              chargeId,
            ExternalId:            externalId,
            SubscriptionId:        sub?.Id,
            CustomerId:            customerId,
            Status:                AbacatePayGateway.MapStatus(statusRaw),
            Metadata:              metadata,
            AmountCents:           amountCents,
            PaidAt:                paidAt,
            ReceiptUrl:            receiptUrl,
            CardLastFour:          card?.Number,
            CardBrand:             card?.Brand,
            // Âncora do período: o instante em que o gateway processou o evento. Usar o relógio
            // local estenderia o ciclo indevidamente quando o webhook chega atrasado ou é retentado.
            SubscriptionUpdatedAt: sub?.UpdatedAt,
            NextChargeAt:          checkout?.NextChargeAt,
            CancelledDueTo:        sub?.CancelledDueTo,
            InstallmentId:         data?.InstallmentId,
            RetryNumber:           data?.RetryNumber);
    }

    // -----------------------------------------------------------------------
    // Mapeamento de tipo de evento
    // -----------------------------------------------------------------------

    // Dois eventos que NÃO existem e não devem ser recriados aqui:
    //   subscription.trial_started — o trial é PDV-side e nenhum produto do catálogo tem trialDays;
    //   subscription.plan_changed  — o AbacatePay não avisa a troca de plano por webhook; ela é
    //                                aplicada de forma síncrona na resposta do endpoint change-plan.
    private static PaymentWebhookType MapType(string e) => e switch
    {
        "checkout.completed"           => PaymentWebhookType.CheckoutCompleted,
        "checkout.refunded"            => PaymentWebhookType.CheckoutRefunded,
        "checkout.disputed"            => PaymentWebhookType.CheckoutDisputed,
        "subscription.completed"       => PaymentWebhookType.SubscriptionCompleted,
        "subscription.renewed"         => PaymentWebhookType.SubscriptionRenewed,
        "subscription.payment_failed"  => PaymentWebhookType.SubscriptionPaymentFailed,
        "subscription.cancelled"       => PaymentWebhookType.SubscriptionCancelled,
        _                              => PaymentWebhookType.Unknown,
    };
}