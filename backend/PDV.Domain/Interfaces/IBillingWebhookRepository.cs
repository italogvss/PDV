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
    Task<Subscription?> GetSubscriptionByUserIdAsync(Guid userId);
    Task<Subscription?> GetSubscriptionByGatewayCustomerIdAsync(string provider, string gatewayCustomerId);

    Task<Payment?> GetPaymentByGatewayChargeIdAsync(string chargeId);
    Task AddPaymentAsync(Payment payment);

    Task<Plan?> GetPlanByIdAsync(Guid id);
    // Reconciliação do plano a partir do preço vigente na assinatura do gateway — é o que mantém
    // `Subscription.PlanId` correto mesmo quando a troca acontece fora do app.
    Task<Plan?> GetPlanByExternalProductIdAsync(string externalProductId);

    Task SaveChangesAsync();
}
