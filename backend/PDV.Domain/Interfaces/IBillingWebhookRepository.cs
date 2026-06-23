using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

// Acesso usado no processamento de webhook — SEM tenant/user context (o webhook é anônimo).
// As entidades de cobrança não têm query filter; os lookups filtram por UserId/gateway-id.
public interface IBillingWebhookRepository
{
    Task<bool> ProcessedEventExistsAsync(string provider, string eventId);
    // Apenas estaciona o registro no contexto — a persistência ocorre no SaveChanges único do processamento.
    Task StageEventAsync(WebhookEvent ev);

    Task<Subscription?> GetSubscriptionByIdAsync(Guid id);
    Task<Subscription?> GetSubscriptionByGatewayIdAsync(string gatewaySubscriptionId);
    Task<Subscription?> GetLiveSubscriptionByUserIdAsync(Guid userId);
    Task<Subscription?> GetLiveSubscriptionByGatewayCustomerIdAsync(string provider, string gatewayCustomerId);

    Task<Payment?> GetPaymentByGatewayChargeIdAsync(string chargeId);
    Task AddPaymentAsync(Payment payment);

    // Mapeia o produto do gateway (prod_...) para o Plan — usado ao aplicar troca de plano via webhook.
    Task<Plan?> GetPlanByExternalProductIdAsync(string externalProductId);

    Task<User?> GetUserByIdAsync(Guid id);
    Task MarkTrialUsedAsync(Guid userId);

    Task SaveChangesAsync();
}
