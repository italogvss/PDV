using PDV.Domain.Entities;
using PDV.Domain.Enums;

namespace PDV.Domain.Interfaces;

public interface ITenantRoleRepository
{
    Task<IEnumerable<TenantRole>> GetAllAsync();
    Task<TenantRole?> GetByIdAsync(Guid id);
    Task AddAsync(TenantRole role);
    Task AddRangeAsync(IEnumerable<TenantRole> roles);
    Task UpdateAsync(TenantRole role);
    Task<bool> HasPermissionAsync(Guid roleId, Permission permission);
    // Retorna true se o role tiver QUALQUER uma das permissões (semântica OR).
    Task<bool> HasAnyPermissionAsync(Guid roleId, IReadOnlyCollection<Permission> permissions);
    Task ReplacePermissionsAsync(Guid roleId, IEnumerable<Permission> permissions);
    Task<int> CountActiveEmployeesAsync(Guid roleId);
    Task<bool> HasAnyEmployeesAsync(Guid roleId);
    Task<IEnumerable<TenantRole>> GetAllInactiveAsync();
    Task<TenantRole?> GetInactiveByIdAsync(Guid id);
    Task RestoreAsync(TenantRole role);
    Task HardDeleteAsync(TenantRole role);
}
