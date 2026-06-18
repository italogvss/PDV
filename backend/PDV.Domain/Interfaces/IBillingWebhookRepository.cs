using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

// Acesso usado no processamento de webhook — SEM tenant/user context (o webhook é anônimo).
// As entidades de cobrança não têm query filter; os lookups filtram por UserId/gateway-id.
public interface IBillingWebhookRepository
{
    Task<bool> ProcessedEventExistsAsync(string provider, string eventId);
    Task RecordEventAsync(WebhookEvent ev);

    Task<Subscription?> GetSubscriptionByIdAsync(Guid id);
    Task<Subscription?> GetSubscriptionByGatewayIdAsync(string gatewaySubscriptionId);
    Task<Subscription?> GetLiveSubscriptionByUserIdAsync(Guid userId);

    Task<Payment?> GetPaymentByGatewayChargeIdAsync(string chargeId);
    Task<Payment?> GetLatestPendingPaymentBySubscriptionIdAsync(Guid subscriptionId);
    Task AddPaymentAsync(Payment payment);

    Task<User?> GetUserByIdAsync(Guid id);

    Task SaveChangesAsync();
}
