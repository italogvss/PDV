using Microsoft.EntityFrameworkCore;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class CustomerRepository(AppDbContext context, ITenantContext tenantContext) : ICustomerRepository
{
    public async Task<Customer?> GetByIdAsync(Guid id) =>
        await context.Customers.FirstOrDefaultAsync(c => c.Id == id);

    public async Task<(IEnumerable<Customer> Data, int TotalCount)> GetAllAsync(
        int page, int pageSize, string? search)
    {
        var query = context.Customers.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(term) ||
                (c.Email != null && c.Email.ToLower().Contains(term)) ||
                (c.Phone != null && c.Phone.Contains(term)) ||
                (c.Document != null && c.Document.Contains(term)));
        }

        var total = await query.CountAsync();
        var data = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (data, total);
    }

    public async Task AddAsync(Customer customer)
    {
        await context.Customers.AddAsync(customer);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Customer customer)
    {
        context.Customers.Update(customer);
        await context.SaveChangesAsync();
    }

    // IgnoreQueryFilters: lista/acessa itens inativos do próprio tenant para gerenciamento da lixeira.
    public async Task<IEnumerable<Customer>> GetAllInactiveAsync() =>
        await context.Customers
            .IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantContext.TenantId && !c.IsActive)
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync();

    public async Task<Customer?> GetInactiveByIdAsync(Guid id) =>
        await context.Customers
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.TenantId == tenantContext.TenantId && c.Id == id && !c.IsActive);

    public async Task RestoreAsync(Customer customer)
    {
        customer.IsActive = true;
        customer.UpdatedAt = DateTime.UtcNow;
        context.Customers.Update(customer);
        await context.SaveChangesAsync();
    }

    public async Task HardDeleteAsync(Customer customer)
    {
        context.Customers.Remove(customer);
        await context.SaveChangesAsync();
    }

    // IgnoreQueryFilters: remove TUDO do tenant, inclusive registros já soft-deletados (IsActive = false).
    // O filtro de TenantId é reaplicado manualmente para não vazar exclusão entre tenants.
    public Task<int> PurgeAllAsync() =>
        context.Customers
            .IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantContext.TenantId)
            .ExecuteDeleteAsync();
}
