using PDV.Application.DTOs.TenantRoles;

namespace PDV.Application.Interfaces;

public interface ITenantRoleService
{
    Task<IEnumerable<TenantRoleResponse>> GetAllAsync();
    Task<TenantRoleResponse> GetByIdAsync(Guid id);
    Task<TenantRoleResponse> CreateAsync(CreateTenantRoleRequest request);
    Task<TenantRoleResponse> UpdateAsync(Guid id, UpdateTenantRoleRequest request);
    Task DeactivateAsync(Guid id);
    Task<IEnumerable<string>> GetPermissionsAsync(Guid id);
    Task<IEnumerable<string>> SetPermissionsAsync(Guid id, SetRolePermissionsRequest request);
}
