using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

// Acesso do processamento de webhook — SEM tenant/user context. As entidades de cobrança não
// têm query filter, então os lookups por UserId/gateway-id funcionam sem IgnoreQueryFilters.
public class BillingWebhookRepository(AppDbContext context) : IBillingWebhookRepository
{
    public async Task<bool> ProcessedEventExistsAsync(string provider, string eventId) =>
        await context.WebhookEvents.AnyAsync(e =>
            e.Provider == provider && e.EventId == eventId && e.Status == "Processed");

    public async Task StageEventAsync(WebhookEvent ev) =>
        await context.WebhookEvents.AddAsync(ev);

    public async Task<Subscription?> GetSubscriptionByIdAsync(Guid id) =>
        await context.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.Id == id);

    public async Task<Subscription?> GetSubscriptionByGatewayIdAsync(string gatewaySubscriptionId) =>
        await context.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.GatewaySubscriptionId == gatewaySubscriptionId);

    // Uma assinatura por usuário (índice único em UserId) — sem filtro de IsActive: a assinatura
    // nunca é soft-deleted, e filtrar por ela esconderia o histórico de quem cancelou.
    public async Task<Subscription?> GetSubscriptionByUserIdAsync(Guid userId) =>
        await context.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == userId);

    // Resolve a assinatura a partir do cliente no gateway (cust_...): GatewayCustomer → UserId → sub.
    // Usado nos eventos subscription.* (que não carregam externalId) e renovações sem externalId.
    public async Task<Subscription?> GetSubscriptionByGatewayCustomerIdAsync(string provider, string gatewayCustomerId)
    {
        var userId = await context.GatewayCustomers
            .Where(c => c.Provider == provider && c.GatewayCustomerId == gatewayCustomerId)
            .Select(c => (Guid?)c.UserId)
            .FirstOrDefaultAsync();

        return userId is null ? null : await GetSubscriptionByUserIdAsync(userId.Value);
    }

    public async Task<Payment?> GetPaymentByGatewayChargeIdAsync(string chargeId) =>
        await context.Payments.FirstOrDefaultAsync(p => p.GatewayChargeId == chargeId);

    public async Task AddPaymentAsync(Payment payment) =>
        await context.Payments.AddAsync(payment);

    public async Task<Plan?> GetPlanByIdAsync(Guid id) =>
        await context.Plans.FirstOrDefaultAsync(p => p.Id == id);

    public Task SaveChangesAsync() => context.SaveChangesAsync();
}
