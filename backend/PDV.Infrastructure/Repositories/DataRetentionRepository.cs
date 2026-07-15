using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

// Reconcilia a retenção de dados a partir do estado da assinatura de cada Owner. Concentrar a regra
// aqui evita espalhar ScheduledDeletionAt por todo handler que expira uma assinatura.
public class DataRetentionRepository(AppDbContext context) : IDataRetentionRepository
{
    public async Task<(int Scheduled, int Cleared)> SyncScheduledDeletionAsync(DateTime now, int retentionDays)
    {
        var links = await context.UserTenants
            .Where(ut => ut.Role == UserRole.Owner)
            .Select(ut => new { ut.UserId, ut.TenantId })
            .ToListAsync();

        if (links.Count == 0) return (0, 0);

        var ownerIds = links.Select(l => l.UserId).Distinct().ToList();
        var tenantIds = links.Select(l => l.TenantId).Distinct().ToList();

        // Uma assinatura por usuário (índice único em UserId) — o dicionário não colide.
        var subscriptions = await context.Subscriptions
            .Where(s => ownerIds.Contains(s.UserId))
            .ToDictionaryAsync(s => s.UserId);

        // IgnoreQueryFilters: o filtro global esconde tenants inativos, e são justamente eles que já
        // têm exclusão agendada — precisamos vê-los para não reagendar por cima.
        var tenants = await context.Tenants
            .IgnoreQueryFilters()
            .Where(t => tenantIds.Contains(t.Id))
            .ToListAsync();

        var scheduled = 0;
        var cleared = 0;

        foreach (var link in links)
        {
            var tenant = tenants.FirstOrDefault(t => t.Id == link.TenantId);
            if (tenant is null) continue;

            // Loja encerrada pelo próprio dono já tem prazo definido em TenantService — não mexer.
            if (!tenant.IsActive) continue;

            subscriptions.TryGetValue(link.UserId, out var subscription);
            var deleteAt = DeletionDeadline(subscription, tenant, now, retentionDays);

            if (tenant.ScheduledDeletionAt == deleteAt) continue;

            if (deleteAt is null) cleared++;
            else scheduled++;

            tenant.ScheduledDeletionAt = deleteAt;
            tenant.UpdatedAt = now;
        }

        if (scheduled > 0 || cleared > 0) await context.SaveChangesAsync();
        return (scheduled, cleared);
    }

    public async Task ClearScheduledDeletionForOwnerAsync(Guid userId)
    {
        var tenantIds = await context.UserTenants
            .Where(ut => ut.UserId == userId && ut.Role == UserRole.Owner)
            .Select(ut => ut.TenantId)
            .ToListAsync();

        if (tenantIds.Count == 0) return;

        // IgnoreQueryFilters: mesma razão do Sync acima — precisa enxergar tenants inativos para não
        // ignorá-los, embora eles sejam pulados logo abaixo (prazo próprio, não mexer).
        var tenants = await context.Tenants
            .IgnoreQueryFilters()
            .Where(t => tenantIds.Contains(t.Id) && t.ScheduledDeletionAt != null)
            .ToListAsync();

        foreach (var tenant in tenants)
        {
            // Loja encerrada pelo próprio dono já tem prazo definido em TenantService — não mexer.
            if (!tenant.IsActive) continue;

            tenant.ScheduledDeletionAt = null;
            tenant.UpdatedAt = DateTime.UtcNow;
        }
    }

    // null = o Owner tem plano válido, nada a excluir. Sem assinatura alguma (nunca assinou nem fez
    // trial), o prazo conta da criação da loja.
    private static DateTime? DeletionDeadline(Subscription? subscription, Tenant tenant, DateTime now, int retentionDays)
    {
        var accessLostAt = subscription is null
            ? tenant.CreatedAt
            : subscription.AccessLostAt(now);

        return accessLostAt?.AddDays(retentionDays);
    }
}
