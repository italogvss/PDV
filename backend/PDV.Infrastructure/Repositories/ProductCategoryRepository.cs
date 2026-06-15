using Microsoft.EntityFrameworkCore;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class ProductCategoryRepository(AppDbContext context, ITenantContext tenantContext) : IProductCategoryRepository
{
    public async Task<ProductCategory?> GetByIdAsync(Guid id) =>
        await context.ProductCategories
            .FirstOrDefaultAsync(c => c.Id == id);

    public async Task<IEnumerable<ProductCategory>> GetAllAsync() =>
        await context.ProductCategories
            .OrderBy(c => c.Name)
            .ToListAsync();

    public async Task AddAsync(ProductCategory category)
    {
        await context.ProductCategories.AddAsync(category);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(ProductCategory category)
    {
        context.ProductCategories.Update(category);
        await context.SaveChangesAsync();
    }

    public async Task<bool> NameExistsAsync(string name, Guid? excludeId = null)
    {
        var query = context.ProductCategories.Where(c => c.Name == name);
        if (excludeId.HasValue)
            query = query.Where(c => c.Id != excludeId.Value);
        return await query.AnyAsync();
    }

    // IgnoreQueryFilters: lista/acessa itens inativos do próprio tenant para gerenciamento da lixeira.
    public async Task<IEnumerable<ProductCategory>> GetAllInactiveAsync() =>
        await context.ProductCategories
            .IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantContext.TenantId && !c.IsActive)
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync();

    public async Task<ProductCategory?> GetInactiveByIdAsync(Guid id) =>
        await context.ProductCategories
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.TenantId == tenantContext.TenantId && c.Id == id && !c.IsActive);

    public async Task RestoreAsync(ProductCategory category)
    {
        category.IsActive = true;
        category.UpdatedAt = DateTime.UtcNow;
        context.ProductCategories.Update(category);
        await context.SaveChangesAsync();
    }

    public async Task HardDeleteAsync(ProductCategory category)
    {
        context.ProductCategories.Remove(category);
        await context.SaveChangesAsync();
    }
}
