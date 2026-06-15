using Microsoft.EntityFrameworkCore;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class SupplierRepository(AppDbContext context, ITenantContext tenantContext) : ISupplierRepository
{
    public async Task<Supplier?> GetByIdAsync(Guid id) =>
        await context.Suppliers.FirstOrDefaultAsync(s => s.Id == id);

    public async Task<(IEnumerable<Supplier> Data, int TotalCount)> GetAllAsync(
        int page, int pageSize, string? search)
    {
        var query = context.Suppliers.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(s =>
                s.Name.ToLower().Contains(term) ||
                (s.Phone != null && s.Phone.Contains(term)));
        }

        var total = await query.CountAsync();
        var data = await query
            .OrderBy(s => s.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (data, total);
    }

    public async Task AddAsync(Supplier supplier)
    {
        await context.Suppliers.AddAsync(supplier);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Supplier supplier)
    {
        context.Suppliers.Update(supplier);
        await context.SaveChangesAsync();
    }

    // IgnoreQueryFilters: lista/acessa itens inativos do próprio tenant para gerenciamento da lixeira.
    public async Task<IEnumerable<Supplier>> GetAllInactiveAsync() =>
        await context.Suppliers
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantContext.TenantId && !s.IsActive)
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync();

    public async Task<Supplier?> GetInactiveByIdAsync(Guid id) =>
        await context.Suppliers
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.TenantId == tenantContext.TenantId && s.Id == id && !s.IsActive);

    public async Task RestoreAsync(Supplier supplier)
    {
        supplier.IsActive = true;
        supplier.UpdatedAt = DateTime.UtcNow;
        context.Suppliers.Update(supplier);
        await context.SaveChangesAsync();
    }

    public async Task HardDeleteAsync(Supplier supplier)
    {
        context.Suppliers.Remove(supplier);
        await context.SaveChangesAsync();
    }

    // IgnoreQueryFilters: remove TUDO do tenant, inclusive registros já soft-deletados (IsActive = false).
    // O filtro de TenantId é reaplicado manualmente para não vazar exclusão entre tenants.
    public Task<int> PurgeAllAsync() =>
        context.Suppliers
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantContext.TenantId)
            .ExecuteDeleteAsync();
}
