using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class ProductCategoryRepository(AppDbContext context) : IProductCategoryRepository
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
}
