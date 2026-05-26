using Microsoft.EntityFrameworkCore;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class ProductRepository(AppDbContext context, ITenantContext tenantContext) : IProductRepository
{
    private Guid TenantId => tenantContext.TenantId;

    public async Task<Product?> GetByIdAsync(Guid id) =>
        await context.Products
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == TenantId);

    public async Task<(IEnumerable<Product> Data, int TotalCount)> GetAllAsync(
        int page, int pageSize,
        string? name = null, string? barcode = null,
        Guid? categoryId = null,
        string? sortBy = null, string? sortOrder = null)
    {
        var query = context.Products
            .Include(p => p.Category)
            .Where(p => p.TenantId == TenantId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(name))
            query = query.Where(p => p.Name.Contains(name));

        if (!string.IsNullOrWhiteSpace(barcode))
            query = query.Where(p => p.Barcode == barcode);

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId.Value);

        query = (sortBy, sortOrder?.ToLower()) switch
        {
            ("price", "desc") => query.OrderByDescending(p => p.Price),
            ("price", _)      => query.OrderBy(p => p.Price),
            ("stock", "desc") => query.OrderByDescending(p => p.Stock),
            ("stock", _)      => query.OrderBy(p => p.Stock),
            (_, "desc")       => query.OrderByDescending(p => p.Name),
            _                 => query.OrderBy(p => p.Name),
        };

        var totalCount = await query.CountAsync();
        var data = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (data, totalCount);
    }

    public async Task AddAsync(Product product)
    {
        await context.Products.AddAsync(product);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Product product)
    {
        context.Products.Update(product);
        await context.SaveChangesAsync();
    }

    public async Task<bool> BarcodeExistsAsync(string barcode, Guid? excludeId = null)
    {
        var query = context.Products.Where(p => p.Barcode == barcode && p.TenantId == TenantId);
        if (excludeId.HasValue)
            query = query.Where(p => p.Id != excludeId.Value);
        return await query.AnyAsync();
    }
}
