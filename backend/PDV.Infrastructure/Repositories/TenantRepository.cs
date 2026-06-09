using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class TenantRepository(AppDbContext context) : ITenantRepository
{
    public Task<Tenant?> GetByIdAsync(Guid id) =>
        context.Tenants.FirstOrDefaultAsync(t => t.Id == id);

    public async Task AddAsync(Tenant tenant)
    {
        context.Tenants.Add(tenant);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Tenant tenant)
    {
        context.Tenants.Update(tenant);
        await context.SaveChangesAsync();
    }

    // TenantSettings não tem query filter global — filtra explicitamente por TenantId.
    public Task<TenantSettings?> GetSettingsAsync(Guid tenantId) =>
        context.TenantSettings.FirstOrDefaultAsync(ts => ts.TenantId == tenantId);

    public async Task UpdateSettingsAsync(TenantSettings settings)
    {
        context.TenantSettings.Update(settings);
        await context.SaveChangesAsync();
    }
}
