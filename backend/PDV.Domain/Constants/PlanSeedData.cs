using PDV.Domain.Enums;

namespace PDV.Domain.Constants;

// Definição declarativa dos planos pagos. O `PlanSeeder` faz upsert idempotente por `Slug` e
// injeta o `ExternalProductId` (o `price_...` do Stripe) a partir da configuração — os ids diferem
// entre as chaves de teste e as de produção, então NÃO moram aqui.
//
// O trial de 30 dias é PDV-side (ver TenantService/TrialDefaults); nenhum preço no gateway usa
// trial nativo. O `Slug` é o ponto de entrada da landing (?plano=<slug>) e a chave que amarra o
// plano ao seu preço na configuração (Stripe:Prices:<slug>).
public static class PlanSeedData
{
    // Essencial (Starter): todos os módulos, NENHUMA feature premium.
    private static readonly IReadOnlyList<string> StarterEntitlements =
        [.. EntitlementCatalog.Modules];

    // Pro (Profissional): todos os módulos + todas as features.
    private static readonly IReadOnlyList<string> ProEntitlements =
        [.. EntitlementCatalog.Modules, .. EntitlementCatalog.Features];

    private static readonly IReadOnlyDictionary<string, int> StarterLimits = new Dictionary<string, int>
    {
        [PlanLimits.SaleHistoryDays] = 90,
        [PlanLimits.Employees] = 2,
        [PlanLimits.AuditDays] = 7,
        [PlanLimits.Stores] = 1,
    };

    private static readonly IReadOnlyDictionary<string, int> ProLimits = new Dictionary<string, int>
    {
        [PlanLimits.SaleHistoryDays] = PlanLimits.Unlimited,
        [PlanLimits.Employees] = PlanLimits.Unlimited,
        [PlanLimits.AuditDays] = PlanLimits.Unlimited,
        [PlanLimits.Stores] = 5,
    };

    public static readonly IReadOnlyList<PlanSeed> Plans =
    [
        new PlanSeed(
            Name: "Plano Essencial Mensal",
            Description: "Essencial para começar: vendas, estoque, clientes e despesas.",
            PriceCents: 2999,
            Entitlements: StarterEntitlements,
            Limits: StarterLimits,
            BillingPeriod: BillingPeriod.Monthly,
            Slug: "essencial-mensal"),

        new PlanSeed(
            Name: "Plano Essencial Anual",
            Description: "Essencial com cobrança anual — economia de 2 meses.",
            PriceCents: 29999,
            Entitlements: StarterEntitlements,
            Limits: StarterLimits,
            BillingPeriod: BillingPeriod.Annual,
            Slug: "essencial-anual"),

        new PlanSeed(
            Name: "Plano Profissional Mensal",
            Description: "Todos os módulos, limites ilimitados, cobrança mensal.",
            PriceCents: 4999,
            Entitlements: ProEntitlements,
            Limits: ProLimits,
            BillingPeriod: BillingPeriod.Monthly,
            Slug: "profissional-mensal"),

        new PlanSeed(
            Name: "Plano Profissional Anual",
            Description: "Todos os módulos, limites ilimitados, cobrança anual — economia de 2 meses.",
            PriceCents: 49999,
            Entitlements: ProEntitlements,
            Limits: ProLimits,
            BillingPeriod: BillingPeriod.Annual,
            Slug: "profissional-anual"),
    ];
}

public record PlanSeed(
    string Name,
    string? Description,
    int PriceCents,
    IReadOnlyList<string> Entitlements,
    IReadOnlyDictionary<string, int> Limits,
    BillingPeriod BillingPeriod,
    string Slug);
