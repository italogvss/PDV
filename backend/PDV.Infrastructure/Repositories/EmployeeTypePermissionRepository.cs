using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class EmployeeTypePermissionRepository(AppDbContext context) : IEmployeeTypePermissionRepository
{
    public async Task<bool> HasPermissionAsync(Guid tenantId, EmployeeType employeeType, Permission permission) =>
        await context.EmployeeTypePermissions
            // IgnoreQueryFilters: verificação explícita abaixo — necessário pois o QueryFilter global
            // leria o TenantId do contexto HTTP, mas este método é chamado no fluxo de autenticação
            // antes do contexto de tenant estar disponível em alguns cenários de middleware
            .AnyAsync(p => p.TenantId == tenantId
                        && p.EmployeeType == employeeType
                        && p.Permission == permission);

    public async Task<IEnumerable<EmployeeTypePermission>> GetByTenantAndTypeAsync(
        Guid tenantId, EmployeeType employeeType) =>
        await context.EmployeeTypePermissions
            .Where(p => p.TenantId == tenantId && p.EmployeeType == employeeType)
            .ToListAsync();

    public async Task ReplaceAsync(Guid tenantId, EmployeeType employeeType, IEnumerable<Permission> permissions)
    {
        var existing = await context.EmployeeTypePermissions
            .Where(p => p.TenantId == tenantId && p.EmployeeType == employeeType)
            .ToListAsync();

        context.EmployeeTypePermissions.RemoveRange(existing);

        var newPermissions = permissions.Select(p => new EmployeeTypePermission
        {
            TenantId = tenantId,
            EmployeeType = employeeType,
            Permission = p,
        });

        await context.EmployeeTypePermissions.AddRangeAsync(newPermissions);
        await context.SaveChangesAsync();
    }
}
