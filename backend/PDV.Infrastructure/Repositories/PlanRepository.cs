using Microsoft.EntityFrameworkCore;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

// Catálogo global de planos — sem tenant/user scope.
public class PlanRepository(AppDbContext context) : IPlanRepository
{
    public async Task<IReadOnlyList<Plan>> GetActiveAsync() =>
        await context.Plans
            .Where(p => p.IsActive)
            .OrderBy(p => p.DisplayOrder)
            .ToListAsync();

    public async Task<Plan?> GetByIdAsync(Guid id) =>
        await context.Plans.FirstOrDefaultAsync(p => p.Id == id);

    public async Task<Plan?> GetByExternalProductIdAsync(string externalProductId) =>
        await context.Plans.FirstOrDefaultAsync(p => p.ExternalProductId == externalProductId);

    public async Task AddAsync(Plan plan)
    {
        await context.Plans.AddAsync(plan);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Plan plan)
    {
        context.Plans.Update(plan);
        await context.SaveChangesAsync();
    }
}
