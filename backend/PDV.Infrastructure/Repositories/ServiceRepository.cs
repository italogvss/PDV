using Microsoft.EntityFrameworkCore;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class ServiceRepository(AppDbContext context, ITenantContext tenantContext) : IServiceRepository
{
    public async Task<Service?> GetByIdAsync(Guid id) =>
        await context.Services
            .Include(s => s.Category)
            .FirstOrDefaultAsync(s => s.Id == id);

    public async Task<(IEnumerable<Service> Data, int TotalCount)> GetAllAsync(
        int page, int pageSize,
        string? name = null,
        Guid? categoryId = null,
        string? sortBy = null, string? sortOrder = null)
    {
        var query = context.Services
            .Include(s => s.Category)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(name))
            query = query.Where(s => s.Name.Contains(name));

        if (categoryId.HasValue)
            query = query.Where(s => s.CategoryId == categoryId.Value);

        query = (sortBy, sortOrder?.ToLower()) switch
        {
            ("price", "desc") => query.OrderByDescending(s => s.Price),
            ("price", _)      => query.OrderBy(s => s.Price),
            (_, "desc")       => query.OrderByDescending(s => s.Name),
            _                 => query.OrderBy(s => s.Name),
        };

        var totalCount = await query.CountAsync();
        var data = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (data, totalCount);
    }

    public async Task AddAsync(Service service)
    {
        await context.Services.AddAsync(service);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Service service)
    {
        context.Services.Update(service);
        await context.SaveChangesAsync();
    }

    // IgnoreQueryFilters: lista/acessa itens inativos do próprio tenant para gerenciamento da lixeira.
    public async Task<IEnumerable<Service>> GetAllInactiveAsync() =>
        await context.Services
            .IgnoreQueryFilters()
            .Include(s => s.Category)
            .Where(s => s.TenantId == tenantContext.TenantId && !s.IsActive)
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync();

    public async Task<Service?> GetInactiveByIdAsync(Guid id) =>
        await context.Services
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.TenantId == tenantContext.TenantId && s.Id == id && !s.IsActive);

    public async Task RestoreAsync(Service service)
    {
        service.IsActive = true;
        service.UpdatedAt = DateTime.UtcNow;
        context.Services.Update(service);
        await context.SaveChangesAsync();
    }

    public async Task HardDeleteAsync(Service service)
    {
        context.Services.Remove(service);
        await context.SaveChangesAsync();
    }

    // IgnoreQueryFilters: remove TUDO do tenant, inclusive registros já soft-deletados (IsActive = false).
    // O filtro de TenantId é reaplicado manualmente para não vazar exclusão entre tenants.
    public Task<int> PurgeAllAsync() =>
        context.Services
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantContext.TenantId)
            .ExecuteDeleteAsync();
}
