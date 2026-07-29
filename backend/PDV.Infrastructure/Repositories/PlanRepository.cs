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
            .OrderBy(p => p.PriceCents)
            .ToListAsync();

    public async Task<IReadOnlyList<Plan>> GetAllAsync() =>
        await context.Plans.OrderBy(p => p.PriceCents).ToListAsync();

    public async Task<Plan?> GetByIdAsync(Guid id) =>
        await context.Plans.FirstOrDefaultAsync(p => p.Id == id);

    public async Task<Plan?> GetByExternalProductIdAsync(string externalProductId) =>
        await context.Plans.FirstOrDefaultAsync(p => p.ExternalProductId == externalProductId);

    // Único consumidor: o trial (TenantService.StartTrialIfEligibleAsync). Deliberadamente NÃO filtra
    // IsActive: o trial não toca o gateway, então um plano desativado por falta de preço configurado
    // (PlanSeeder) ainda é um plano válido para testar. O checkout resolve por Id e valida o preço no
    // gateway, e a grade de planos usa GetActiveAsync — nenhum dos dois passa por aqui.
    public async Task<Plan?> GetBySlugAsync(string? slug)
    {
        if (string.IsNullOrWhiteSpace(slug)) return null;
        return await context.Plans
            .Where(p => p.Slug == slug)
            .OrderBy(p => p.PriceCents)
            .FirstOrDefaultAsync();
    }

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
