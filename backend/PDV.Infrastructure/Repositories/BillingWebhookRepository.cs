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

    public async Task<Subscription?> GetLiveSubscriptionByUserIdAsync(Guid userId) =>
        await context.Subscriptions
            .Include(s => s.Plan)
            .Where(s => s.UserId == userId && s.IsActive)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

    // Resolve a assinatura viva a partir do cliente no gateway (cust_...): GatewayCustomer → UserId → sub.
    // Usado nos eventos subscription.* (que não carregam externalId) e renovações sem externalId.
    public async Task<Subscription?> GetLiveSubscriptionByGatewayCustomerIdAsync(string provider, string gatewayCustomerId)
    {
        var userId = await context.GatewayCustomers
            .Where(c => c.Provider == provider && c.GatewayCustomerId == gatewayCustomerId)
            .Select(c => (Guid?)c.UserId)
            .FirstOrDefaultAsync();

        return userId is null ? null : await GetLiveSubscriptionByUserIdAsync(userId.Value);
    }

    public async Task<Payment?> GetPaymentByGatewayChargeIdAsync(string chargeId) =>
        await context.Payments.FirstOrDefaultAsync(p => p.GatewayChargeId == chargeId);

    public async Task AddPaymentAsync(Payment payment) =>
        await context.Payments.AddAsync(payment);

    public async Task<Plan?> GetPlanByExternalProductIdAsync(string externalProductId) =>
        await context.Plans.FirstOrDefaultAsync(p => p.ExternalProductId == externalProductId);

    public async Task<User?> GetUserByIdAsync(Guid id) =>
        await context.Users.FirstOrDefaultAsync(u => u.Id == id);

    public async Task MarkTrialUsedAsync(Guid userId)
    {
        var user = await context.Users.FindAsync(userId);
        if (user is not null && !user.HasUsedTrial)
        {
            user.HasUsedTrial = true;
            user.UpdatedAt = DateTime.UtcNow;
        }
    }

    public Task SaveChangesAsync() => context.SaveChangesAsync();
}
