using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

// Assinatura é scoped por UserId (Owner) — filtro explícito, sem query filter de tenant.
public class SubscriptionRepository(AppDbContext context) : ISubscriptionRepository
{
    public async Task<Subscription?> GetLiveByUserIdAsync(Guid userId) =>
        await context.Subscriptions
            .Include(s => s.Plan)
            .Include(s => s.PendingPlan)
            .Where(s => s.UserId == userId && s.IsActive)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

    public async Task AddAsync(Subscription subscription)
    {
        await context.Subscriptions.AddAsync(subscription);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Subscription subscription)
    {
        context.Subscriptions.Update(subscription);
        await context.SaveChangesAsync();
    }
}
