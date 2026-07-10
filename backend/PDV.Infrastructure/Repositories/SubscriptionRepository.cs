using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

// Assinatura é scoped por UserId (Owner) — filtro explícito, sem query filter de tenant.
//
// Nenhuma query filtra por IsActive: a Subscription NUNCA é soft-deleted (o cancelamento muda o
// Status), e o filtro só criava a armadilha de sumir com a assinatura de quem cancelou — junto com
// seu histórico e sua elegibilidade a reassinar.
public class SubscriptionRepository(AppDbContext context) : ISubscriptionRepository
{
    // Uma assinatura por usuário — índice único em UserId.
    public async Task<Subscription?> GetByUserIdAsync(Guid userId) =>
        await context.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == userId);

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

    // Expira assinaturas canceladas cujo período já terminou (varrido pelo BackgroundService).
    // Sem query filter de tenant — varre todos os usuários por design.
    public async Task<int> ExpireCanceledPastPeriodAsync(DateTime now)
    {
        var due = await context.Subscriptions
            .Where(s => s.Status == SubscriptionStatus.Canceled
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

    // Expira trials PDV-side vencidos (TrialEndsAt no passado, sem virar assinatura paga).
    public async Task<int> ExpireTrialingPastEndAsync(DateTime now)
    {
        var due = await context.Subscriptions
            .Where(s => s.Status == SubscriptionStatus.Trialing
                && s.TrialEndsAt != null
                && s.TrialEndsAt < now)
            .ToListAsync();

        foreach (var sub in due)
        {
            sub.Status = SubscriptionStatus.Expired;
            sub.UpdatedAt = now;
        }

        if (due.Count > 0) await context.SaveChangesAsync();
        return due.Count;
    }

    // Expira checkouts Pending abandonados há mais que o TTL (usuário nunca voltou do gateway).
    public async Task<int> ExpireStalePendingAsync(DateTime cutoff)
    {
        var due = await context.Subscriptions
            .Where(s => s.Status == SubscriptionStatus.Pending && s.UpdatedAt < cutoff)
            .ToListAsync();

        foreach (var sub in due)
        {
            sub.Status = SubscriptionStatus.Expired;
            sub.UpdatedAt = DateTime.UtcNow;
        }

        if (due.Count > 0) await context.SaveChangesAsync();
        return due.Count;
    }
}
