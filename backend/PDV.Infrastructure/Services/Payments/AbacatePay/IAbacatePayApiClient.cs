using PDV.Infrastructure.Services.Payments.AbacatePay.Models;

namespace PDV.Infrastructure.Services.Payments.AbacatePay;

// "Como falar com a API": monta request, auth, envelope e erros. Sem regra de negócio.
public interface IAbacatePayApiClient
{
    Task<AbacateCustomer> CreateCustomerAsync(CreateCustomerBody body, CancellationToken ct = default);
    Task<AbacateCheckout> CreateSubscriptionAsync(CreateSubscriptionBody body, CancellationToken ct = default);
    Task<AbacateTransparent> CreateTransparentAsync(CreateTransparentBody body, CancellationToken ct = default);
    Task<AbacatePlanChange> ChangePlanAsync(ChangePlanBody body, CancellationToken ct = default);
    Task<AbacateSubscription> CancelSubscriptionAsync(CancelSubscriptionBody body, CancellationToken ct = default);
    Task<AbacateChargeStatus> GetCheckoutAsync(string id, CancellationToken ct = default);
    Task<AbacateChargeStatus> CheckTransparentAsync(string id, CancellationToken ct = default);
    Task<AbacateChargeStatus> SimulatePixPaymentAsync(string pixChargeId, CancellationToken ct = default);
    Task<AbacateProduct?> GetProductAsync(string externalId, CancellationToken ct = default);
}
