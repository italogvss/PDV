using PDV.Application.DTOs.Payments;

namespace PDV.Application.Interfaces.Payments;

// Interface genérica de gateway de pagamentos. A orquestração de assinatura fala apenas com
// esta abstração — trocar de provedor = nova implementação, sem tocar nos serviços de negócio.
public interface IPaymentGateway
{
    string Provider { get; }

    Task<GatewayCustomerResult> EnsureCustomerAsync(CustomerInfo info, CancellationToken ct = default);

    // Assinatura recorrente por cartão — devolve a URL do checkout hospedado.
    Task<HostedCheckoutResult> CreateSubscriptionCheckoutAsync(SubscriptionCheckoutRequest request, CancellationToken ct = default);

    // Checkout transparente — PIX embutido (brCode + brCodeBase64), sem redirecionar.
    Task<PixChargeResult> CreatePixChargeAsync(PixChargeRequest request, CancellationToken ct = default);

    Task<PlanChangeResult> ChangeSubscriptionPlanAsync(string gatewaySubscriptionId, string newProductExternalId, int quantity, CancellationToken ct = default);

    Task CancelSubscriptionAsync(string gatewaySubscriptionId, CancellationToken ct = default);

    // Fallback de polling (preferir webhook).
    Task<GatewayChargeStatus> GetChargeStatusAsync(string chargeId, CancellationToken ct = default);
}
