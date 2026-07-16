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

        // Owners com encerramento de conta EXPLÍCITO em curso: o prazo das lojas deles é gerido pelo
        // fluxo de exclusão (ScheduleAccountDeletionForOwnerAsync), não pela assinatura. Pular aqui
        // evita que este job sobrescreva/limpe o ScheduledDeletionAt explícito — crítico no Path B, em
        // que a assinatura Canceled ainda dá acesso (AccessLostAt null limparia o agendamento).
        var deletionOwners = (await context.Users
            .Where(u => ownerIds.Contains(u.Id) && u.AccountDeletionRequestedAt != null)
            .Select(u => u.Id)
            .ToListAsync())
            .ToHashSet();

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

            // Encerramento de conta explícito gerencia o prazo — não sobrescrever (ver acima).
            if (deletionOwners.Contains(link.UserId)) continue;

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

    public async Task<int> ScheduleAccountDeletionForOwnerAsync(Guid userId, DateTime deleteAt)
    {
        var tenants = await OwnerActiveTenantsAsync(userId);
        var now = DateTime.UtcNow;
        foreach (var tenant in tenants)
        {
            tenant.ScheduledDeletionAt = deleteAt;
            tenant.UpdatedAt = now;
        }

        if (tenants.Count > 0) await context.SaveChangesAsync();
        return tenants.Count;
    }

    public async Task<int> ClearAccountDeletionForOwnerAsync(Guid userId)
    {
        var tenants = await OwnerActiveTenantsAsync(userId);
        var now = DateTime.UtcNow;
        var cleared = 0;
        foreach (var tenant in tenants)
        {
            if (tenant.ScheduledDeletionAt is null) continue;
            tenant.ScheduledDeletionAt = null;
            tenant.UpdatedAt = now;
            cleared++;
        }

        if (cleared > 0) await context.SaveChangesAsync();
        return cleared;
    }

    // Lojas ATIVAS de um Owner. Lojas inativas (encerradas manualmente) têm prazo próprio e ficam de
    // fora tanto do agendamento quanto da reversão de encerramento de conta.
    private async Task<List<Tenant>> OwnerActiveTenantsAsync(Guid userId)
    {
        var tenantIds = await context.UserTenants
            .Where(ut => ut.UserId == userId && ut.Role == UserRole.Owner)
            .Select(ut => ut.TenantId)
            .ToListAsync();

        if (tenantIds.Count == 0) return [];

        // IgnoreQueryFilters: sem tenant context aqui, o filtro global esconderia as lojas.
        return await context.Tenants
            .IgnoreQueryFilters()
            .Where(t => tenantIds.Contains(t.Id) && t.IsActive)
            .ToListAsync();
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
