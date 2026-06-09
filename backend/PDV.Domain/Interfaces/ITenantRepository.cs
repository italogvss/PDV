using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface ITenantRepository
{
    Task<Tenant?> GetByIdAsync(Guid id);
    Task AddAsync(Tenant tenant);
    Task UpdateAsync(Tenant tenant);
    Task<TenantSettings?> GetSettingsAsync(Guid tenantId);
    Task UpdateSettingsAsync(TenantSettings settings);
}
