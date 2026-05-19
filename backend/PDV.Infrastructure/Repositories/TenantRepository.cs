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
}
