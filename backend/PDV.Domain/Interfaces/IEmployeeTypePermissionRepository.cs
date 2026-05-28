using PDV.Domain.Entities;
using PDV.Domain.Enums;

namespace PDV.Domain.Interfaces;

public interface IEmployeeTypePermissionRepository
{
    Task<bool> HasPermissionAsync(Guid tenantId, EmployeeType employeeType, Permission permission);
    Task<IEnumerable<EmployeeTypePermission>> GetByTenantAndTypeAsync(Guid tenantId, EmployeeType employeeType);
    Task ReplaceAsync(Guid tenantId, EmployeeType employeeType, IEnumerable<Permission> permissions);
}
