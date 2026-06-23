using PDV.Application.Helpers;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

// Insere/atualiza os planos pagos a partir de PlanSeedData (idempotente por ExternalProductId).
// Chamado no startup, após Database.Migrate().
public class PlanSeeder(IPlanRepository planRepository)
{
    public async Task SeedAsync()
    {
        foreach (var seed in PlanSeedData.Plans)
        {
            var existing = await planRepository.GetByExternalProductIdAsync(seed.ExternalProductId);
            if (existing is null)
            {
                await planRepository.AddAsync(Map(seed));
            }
            else
            {
                Apply(existing, seed);
                await planRepository.UpdateAsync(existing);
            }
        }
    }

    private static Plan Map(PlanSeed seed)
    {
        var plan = new Plan();
        Apply(plan, seed);
        plan.ExternalProductId = seed.ExternalProductId;
        return plan;
    }

    private static void Apply(Plan plan, PlanSeed seed)
    {
        plan.Name = seed.Name;
        plan.Description = seed.Description;
        plan.PriceCents = seed.PriceCents;
        plan.TrialDays = seed.TrialDays;
        plan.ModulesJson = OperationModuleHelper.Serialize(seed.Modules);
        plan.LimitsJson = PlanJson.SerializeLimits(seed.Limits);
        plan.DisplayOrder = seed.DisplayOrder;
        plan.SupportsCard = seed.SupportsCard;
        plan.SupportsPix = seed.SupportsPix;
        plan.BillingPeriod = seed.BillingPeriod;
        plan.UpdatedAt = DateTime.UtcNow;
    }
}
