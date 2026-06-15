using Microsoft.EntityFrameworkCore;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class TenantRoleRepository(AppDbContext context, ITenantContext tenantContext) : ITenantRoleRepository
{
    public async Task<IEnumerable<TenantRole>> GetAllAsync() =>
        await context.TenantRoles
            .Include(r => r.Permissions)
            .Include(r => r.Employees)
            .AsSplitQuery()
            .OrderBy(r => r.Name)
            .ToListAsync();

    public async Task<TenantRole?> GetByIdAsync(Guid id) =>
        await context.TenantRoles
            .Include(r => r.Permissions)
            .Include(r => r.Employees)
            .AsSplitQuery()
            .FirstOrDefaultAsync(r => r.Id == id);

    public async Task AddAsync(TenantRole role)
    {
        await context.TenantRoles.AddAsync(role);
        await context.SaveChangesAsync();
    }

    public async Task AddRangeAsync(IEnumerable<TenantRole> roles)
    {
        await context.TenantRoles.AddRangeAsync(roles);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(TenantRole role)
    {
        context.TenantRoles.Update(role);
        await context.SaveChangesAsync();
    }

    public async Task<bool> HasPermissionAsync(Guid roleId, Permission permission) =>
        // Query direto em TenantRolePermissions — sem query filter (join entity sem TenantId)
        await context.TenantRolePermissions
            .AnyAsync(p => p.TenantRoleId == roleId && p.Permission == permission);

    public async Task ReplacePermissionsAsync(Guid roleId, IEnumerable<Permission> permissions)
    {
        var existing = await context.TenantRolePermissions
            .Where(p => p.TenantRoleId == roleId)
            .ToListAsync();

        context.TenantRolePermissions.RemoveRange(existing);

        var newPermissions = permissions.Select(p => new TenantRolePermission
        {
            TenantRoleId = roleId,
            Permission = p,
        });

        await context.TenantRolePermissions.AddRangeAsync(newPermissions);
        await context.SaveChangesAsync();
    }

    public async Task<int> CountActiveEmployeesAsync(Guid roleId) =>
        await context.Employees.CountAsync(e => e.RoleId == roleId);

    // IgnoreQueryFilters: verifica vínculos mesmo em Employees soft-deleted para garantir integridade antes do hard delete.
    public async Task<bool> HasAnyEmployeesAsync(Guid roleId) =>
        await context.Employees
            .IgnoreQueryFilters()
            .AnyAsync(e => e.RoleId == roleId);

    // IgnoreQueryFilters: lista/acessa itens inativos do próprio tenant para gerenciamento da lixeira.
    public async Task<IEnumerable<TenantRole>> GetAllInactiveAsync() =>
        await context.TenantRoles
            .IgnoreQueryFilters()
            .Where(r => r.TenantId == tenantContext.TenantId && !r.IsActive)
            .OrderByDescending(r => r.UpdatedAt)
            .ToListAsync();

    public async Task<TenantRole?> GetInactiveByIdAsync(Guid id) =>
        await context.TenantRoles
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.TenantId == tenantContext.TenantId && r.Id == id && !r.IsActive);

    public async Task RestoreAsync(TenantRole role)
    {
        role.IsActive = true;
        role.UpdatedAt = DateTime.UtcNow;
        context.TenantRoles.Update(role);
        await context.SaveChangesAsync();
    }

    public async Task HardDeleteAsync(TenantRole role)
    {
        context.TenantRoles.Remove(role);
        await context.SaveChangesAsync();
    }
}
