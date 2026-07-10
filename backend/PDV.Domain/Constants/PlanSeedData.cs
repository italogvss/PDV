using PDV.Domain.Enums;

namespace PDV.Domain.Constants;

// Definição declarativa dos planos pagos. O `PlanSeeder` faz upsert idempotente por
// `ExternalProductId`. Os produtos já existem no AbacatePay com o ciclo correto
// (MONTHLY ou ANNUAL). Sem `trialDays` no gateway — o trial de 30 dias é controlado
// inteiramente pelo PDV (ver TenantService/TrialDefaults), então as variantes "(Trial)"
// foram removidas do seed.
//
// Os `ExternalProductId` (prod_...) abaixo são os ids reais do catálogo no AbacatePay
// (versão final de produção). O nome legível do produto (essencial-mensal, profissional-anual, ...)
// está no comentário de cada bloco. O `Slug` é o ponto de entrada da landing (?plano=<slug>).
// Todos os planos aceitam cartão e PIX.
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
        // ── Essencial Mensal ─────────────────────────────────────────────────────────
        // AbacatePay: essencial-mensal (prod_LzwznAgbxBqQkHJ4ZNhRq5uX) — R$ 29,99/mês
        new PlanSeed(
            Name: "Plano Essencial Mensal",
            Description: "Essencial para começar: vendas, estoque, clientes e despesas.",
            ExternalProductId: "prod_LzwznAgbxBqQkHJ4ZNhRq5uX",
            PriceCents: 2999,
            Entitlements: StarterEntitlements,
            Limits: StarterLimits,
            BillingPeriod: BillingPeriod.Monthly,
            Slug: "essencial-mensal"),

        // ── Essencial Anual ──────────────────────────────────────────────────────────
        // AbacatePay: essencial-anual (prod_1Fq6LAq5wXnenUw6X4L36FWX) — R$ 299,99/ano
        new PlanSeed(
            Name: "Plano Essencial Anual",
            Description: "Essencial com cobrança anual — economia de 2 meses.",
            ExternalProductId: "prod_1Fq6LAq5wXnenUw6X4L36FWX",
            PriceCents: 29999,
            Entitlements: StarterEntitlements,
            Limits: StarterLimits,
            BillingPeriod: BillingPeriod.Annual,
            Slug: "essencial-anual"),

        // ── Profissional Mensal ──────────────────────────────────────────────────────
        // AbacatePay: profissional-mensal (prod_czbpxhGs1MgpuwqJpMkN6XGZ) — R$ 49,99/mês
        new PlanSeed(
            Name: "Plano Profissional Mensal",
            Description: "Todos os módulos, limites ilimitados, cobrança mensal.",
            ExternalProductId: "prod_czbpxhGs1MgpuwqJpMkN6XGZ",
            PriceCents: 4999,
            Entitlements: ProEntitlements,
            Limits: ProLimits,
            BillingPeriod: BillingPeriod.Monthly,
            Slug: "profissional-mensal"),

        // ── Profissional Anual ───────────────────────────────────────────────────────
        // AbacatePay: profissional-anual (prod_wmAAU6jKsz6fMJypgHmKf4cL) — R$ 499,99/ano
        new PlanSeed(
            Name: "Plano Profissional Anual",
            Description: "Todos os módulos, limites ilimitados, cobrança anual — economia de 2 meses.",
            ExternalProductId: "prod_wmAAU6jKsz6fMJypgHmKf4cL",
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
    string ExternalProductId,
    int PriceCents,
    IReadOnlyList<string> Entitlements,
    IReadOnlyDictionary<string, int> Limits,
    BillingPeriod BillingPeriod = BillingPeriod.Monthly,
    string Slug = "");
