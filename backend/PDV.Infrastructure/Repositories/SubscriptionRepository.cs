using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

// Assinatura é scoped por UserId (Owner) — filtro explícito, sem query filter de tenant.
public class SubscriptionRepository(AppDbContext context) : ISubscriptionRepository
{
    public async Task<Subscription?> GetLiveByUserIdAsync(Guid userId) =>
        await context.Subscriptions
            .Include(s => s.Plan)
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

    // Remoção FÍSICA (não soft delete) — cancelamento em trial volta o usuário ao Free sem
    // deixar assinatura para reativar em trial. Deletar os Payment da sub antes (FK).
    public async Task DeleteAsync(Subscription subscription)
    {
        context.Subscriptions.Remove(subscription);
        await context.SaveChangesAsync();
    }

    // Expira assinaturas canceladas cujo período já terminou (varrido pelo BackgroundService).
    // Sem query filter de tenant — varre todos os usuários por design.
    public async Task<int> ExpireCanceledPastPeriodAsync(DateTime now)
    {
        var due = await context.Subscriptions
            .Where(s => s.IsActive
                && s.Status == SubscriptionStatus.Canceled
                && s.CurrentPeriodEnd != null
                && s.CurrentPeriodEnd < now)
            .ToListAsync();

        foreach (var sub in due)
        {
            sub.Status = SubscriptionStatus.Expired;
            sub.UpdatedAt = now;
        }

        if (due.Count > 0) await context.SaveChangesAsync();
        return due.Count;
    }
}
