using PDV.Application.DTOs.Payments;

namespace PDV.Application.Interfaces.Payments;

// "Entender o que o gateway está dizendo no webhook": valida autenticidade (secret + HMAC) e
// traduz o payload para o modelo de domínio (PaymentWebhookEvent).
public interface IPaymentWebhookProcessor
{
    string Provider { get; }

    // Secret enviado como query param na URL do webhook.
    bool VerifySecret(string? secretFromQuery);

    // Assinatura HMAC-SHA256 do corpo raw (header X-Webhook-Signature, base64).
    bool VerifySignature(string rawBody, string? signatureHeader);

    PaymentWebhookEvent Parse(string rawBody);
}
