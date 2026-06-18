using PDV.Application.DTOs.Payments;

namespace PDV.Application.Interfaces;

// Aplica um evento de webhook (já verificado e normalizado) ao estado de assinatura/pagamento.
// Deve ser idempotente nas operações que criam registros (ex.: cobranças de renovação).
public interface IBillingWebhookService
{
    Task ProcessAsync(PaymentWebhookEvent evt);
}
