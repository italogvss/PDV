using PDV.Application.DTOs.Payments;

namespace PDV.Application.Interfaces.Payments;

// "Entender o que o gateway está dizendo no webhook": verifica a autenticidade sobre o corpo RAW
// e traduz o payload para o modelo de domínio. Não toca no banco — é puro.
public interface IPaymentWebhookProcessor
{
    string Provider { get; }

    // Verifica a assinatura criptográfica do corpo raw ANTES de qualquer parse (CG-10) e devolve o
    // evento normalizado. Lança UnauthorizedException quando a assinatura não confere ou expirou.
    PaymentWebhookEvent Parse(string rawBody, string? signatureHeader);
}
