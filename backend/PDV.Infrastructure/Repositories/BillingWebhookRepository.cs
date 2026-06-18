using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
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

    public async Task RecordEventAsync(WebhookEvent ev)
    {
        await context.WebhookEvents.AddAsync(ev);
        await context.SaveChangesAsync();
    }

    public async Task<Subscription?> GetSubscriptionByIdAsync(Guid id) =>
        await context.Subscriptions
            .Include(s => s.Plan)
            .Include(s => s.PendingPlan)
            .FirstOrDefaultAsync(s => s.Id == id);

    public async Task<Subscription?> GetSubscriptionByGatewayIdAsync(string gatewaySubscriptionId) =>
        await context.Subscriptions
            .Include(s => s.Plan)
            .Include(s => s.PendingPlan)
            .FirstOrDefaultAsync(s => s.GatewaySubscriptionId == gatewaySubscriptionId);

    public async Task<Subscription?> GetLiveSubscriptionByUserIdAsync(Guid userId) =>
        await context.Subscriptions
            .Include(s => s.Plan)
            .Include(s => s.PendingPlan)
            .Where(s => s.UserId == userId && s.IsActive)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

    public async Task<Payment?> GetPaymentByGatewayChargeIdAsync(string chargeId) =>
        await context.Payments.FirstOrDefaultAsync(p => p.GatewayChargeId == chargeId);

    public async Task<Payment?> GetLatestPendingPaymentBySubscriptionIdAsync(Guid subscriptionId) =>
        await context.Payments
            .Where(p => p.SubscriptionId == subscriptionId && p.Status == PaymentStatus.Pending)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();

    public async Task AddPaymentAsync(Payment payment) =>
        await context.Payments.AddAsync(payment);

    public async Task<User?> GetUserByIdAsync(Guid id) =>
        await context.Users.FirstOrDefaultAsync(u => u.Id == id);

    public Task SaveChangesAsync() => context.SaveChangesAsync();
}
