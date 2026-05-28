using Microsoft.EntityFrameworkCore;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class EmployeeRepository(AppDbContext context, ITenantContext tenantContext) : IEmployeeRepository
{
    public async Task<Employee?> GetByIdAsync(Guid id) =>
        await context.Employees
            .Include(e => e.User)
            .FirstOrDefaultAsync(e => e.Id == id);

    public async Task<Employee?> GetByIdAnyStatusAsync(Guid id) =>
        // IgnoreQueryFilters necessário: reativação precisa encontrar funcionários inativos (IsActive = false)
        await context.Employees
            .IgnoreQueryFilters()
            .Include(e => e.User)
            .FirstOrDefaultAsync(e => e.Id == id && e.TenantId == tenantContext.TenantId);

    public async Task<Employee?> GetByUserIdAsync(Guid userId, Guid tenantId) =>
        await context.Employees
            .Include(e => e.User)
            // QueryFilter global já filtra por TenantId — parâmetro tenantId não precisa de filtro manual
            .FirstOrDefaultAsync(e => e.UserId == userId);

    public async Task<(IEnumerable<Employee> Data, int TotalCount)> GetAllAsync(
        int page, int pageSize)
    {
        var query = context.Employees
            .Include(e => e.User)
            .OrderBy(e => e.User.Name)
            .AsQueryable();

        var totalCount = await query.CountAsync();
        var data = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (data, totalCount);
    }

    public async Task AddAsync(Employee employee)
    {
        await context.Employees.AddAsync(employee);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Employee employee)
    {
        context.Employees.Update(employee);
        await context.SaveChangesAsync();
    }
}
