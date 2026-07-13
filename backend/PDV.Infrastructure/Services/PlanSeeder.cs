using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PDV.Application.Helpers;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Services.Payments.Stripe;

namespace PDV.Infrastructure.Services;

// Insere/atualiza os planos pagos a partir de PlanSeedData, casando por Slug (idempotente).
// O `ExternalProductId` (o `price_...` do Stripe) vem da configuração — cada slug tem o seu em
// `Stripe:Prices:<slug>`. Chamado no startup, após Database.Migrate().
//
// Um plano cujo preço não está configurado é DESATIVADO em vez de semeado com um id vazio: o índice
// único em ExternalProductId não tolera dois vazios, e um plano sem preço válido não pode ir para o
// checkout. Assim a app sobe mesmo com a configuração pela metade (ex.: dev sem chaves do Stripe).
public class PlanSeeder(IPlanRepository planRepository, IOptions<StripeOptions> stripeOptions, ILogger<PlanSeeder> logger)
{
    private readonly StripeOptions _options = stripeOptions.Value;

    public async Task SeedAsync()
    {
        var existing = (await planRepository.GetAllAsync())
            .Where(p => !string.IsNullOrEmpty(p.Slug))
            .GroupBy(p => p.Slug, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        foreach (var seed in PlanSeedData.Plans)
        {
            existing.TryGetValue(seed.Slug, out var plan);

            if (!_options.Prices.TryGetValue(seed.Slug, out var priceId) || string.IsNullOrWhiteSpace(priceId))
            {
                if (plan is { IsActive: true })
                {
                    logger.LogWarning("Plano {Slug} sem preço configurado (Stripe:Prices:{Slug}) — desativado.", seed.Slug, seed.Slug);
                    plan.IsActive = false;
                    plan.UpdatedAt = DateTime.UtcNow;
                    await planRepository.UpdateAsync(plan);
                }
                else
                {
                    logger.LogWarning("Plano {Slug} sem preço configurado (Stripe:Prices:{Slug}) — não semeado.", seed.Slug, seed.Slug);
                }
                continue;
            }

            if (plan is null)
            {
                await planRepository.AddAsync(Map(seed, priceId));
            }
            else
            {
                Apply(plan, seed, priceId);
                await planRepository.UpdateAsync(plan);
            }
        }
    }

    private static Plan Map(PlanSeed seed, string priceId)
    {
        var plan = new Plan();
        Apply(plan, seed, priceId);
        return plan;
    }

    private static void Apply(Plan plan, PlanSeed seed, string priceId)
    {
        plan.Name = seed.Name;
        plan.Description = seed.Description;
        plan.Slug = seed.Slug;
        plan.PriceCents = seed.PriceCents;
        plan.ExternalProductId = priceId;
        plan.EntitledModulesJson = PlanJson.SerializeEntitlements(seed.Entitlements);
        plan.LimitsJson = PlanJson.SerializeLimits(seed.Limits);
        plan.BillingPeriod = seed.BillingPeriod;
        plan.IsActive = true;
        plan.UpdatedAt = DateTime.UtcNow;
    }
}
