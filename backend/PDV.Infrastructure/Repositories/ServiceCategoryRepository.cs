using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class ServiceCategoryRepository(AppDbContext context) : IServiceCategoryRepository
{
    public async Task<ServiceCategory?> GetByIdAsync(Guid id) =>
        await context.ServiceCategories.FirstOrDefaultAsync(c => c.Id == id);

    public async Task<IEnumerable<ServiceCategory>> GetAllAsync() =>
        await context.ServiceCategories.OrderBy(c => c.Name).ToListAsync();

    public async Task AddAsync(ServiceCategory category)
    {
        await context.ServiceCategories.AddAsync(category);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(ServiceCategory category)
    {
        context.ServiceCategories.Update(category);
        await context.SaveChangesAsync();
    }

    public async Task<bool> NameExistsAsync(string name, Guid? excludeId = null)
    {
        var query = context.ServiceCategories.Where(c => c.Name == name);
        if (excludeId.HasValue)
            query = query.Where(c => c.Id != excludeId.Value);
        return await query.AnyAsync();
    }
}
