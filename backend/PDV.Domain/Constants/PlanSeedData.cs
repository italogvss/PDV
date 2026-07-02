using PDV.Domain.Enums;

namespace PDV.Domain.Constants;

// Definição declarativa dos planos pagos. O `PlanSeeder` faz upsert idempotente por
// `ExternalProductId`. Os produtos já existem no AbacatePay com o ciclo correto
// (MONTHLY ou ANNUAL). Sem `trialDays` no gateway — o trial de 30 dias é controlado
// inteiramente pelo PDV (ver TenantService/TrialDefaults), então as variantes "(Trial)"
// foram removidas do seed.
//
// Os `ExternalProductId` (prod_...) abaixo são os ids reais do catálogo no AbacatePay
// (devMode). O nome legível do produto (plano-mensal, plano-anual-pro, ...) está no
// comentário de cada bloco. O `Slug` é o ponto de entrada da landing (?plano=<slug>),
// preenchido só nos planos mensais canônicos de cada tier.
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
        // ── Starter Mensal ───────────────────────────────────────────────────────────
        // AbacatePay: plano-mensal (prod_kNUahnCQuYUMAU6CM4HJg1dg) — R$ 35,00/mês
        // Slug "essencial": ponto de entrada do card Essencial da landing.
        new PlanSeed(
            Name: "Starter Mensal",
            Description: "Essencial para começar: vendas, estoque, clientes e despesas.",
            ExternalProductId: "prod_kNUahnCQuYUMAU6CM4HJg1dg",
            PriceCents: 3500,
            TrialDays: null,
            Entitlements: StarterEntitlements,
            Limits: StarterLimits,
            SupportsCard: true,
            SupportsPix: false,
            BillingPeriod: BillingPeriod.Monthly,
            DisplayOrder: 1,
            Slug: "essencial"),

        // ── Starter Anual ────────────────────────────────────────────────────────────
        // AbacatePay: plano-anual (prod_ggDACnfD3rbfSdmBuFa3Sd0G) — R$ 375,00/ano
        new PlanSeed(
            Name: "Starter Anual",
            Description: "Starter com cobrança anual — economia de 2 meses.",
            ExternalProductId: "prod_ggDACnfD3rbfSdmBuFa3Sd0G",
            PriceCents: 37500,
            TrialDays: null,
            Entitlements: StarterEntitlements,
            Limits: StarterLimits,
            SupportsCard: true,
            SupportsPix: true,
            DisplayOrder: 3,
            BillingPeriod: BillingPeriod.Annual),

        // ── Pro Mensal ───────────────────────────────────────────────────────────────
        // AbacatePay: plano-mensal-pro (prod_WprrUe0bPSghwptpJSCEc2rY) — R$ 50,00/mês
        // Slug "profissional": ponto de entrada dos cards Profissional e Avançado da landing
        // (único tier ilimitado). Ajustar se um tier "avancado" dedicado for criado depois.
        new PlanSeed(
            Name: "Pro Mensal",
            Description: "Todos os módulos, limites ilimitados, cobrança mensal.",
            ExternalProductId: "prod_WprrUe0bPSghwptpJSCEc2rY",
            PriceCents: 5000,
            TrialDays: null,
            Entitlements: ProEntitlements,
            Limits: ProLimits,
            SupportsCard: true,
            SupportsPix: false,
            DisplayOrder: 5,
            BillingPeriod: BillingPeriod.Monthly,
            Slug: "profissional"),

        // ── Pro Anual ────────────────────────────────────────────────────────────────
        // AbacatePay: plano-anual-pro (prod_k53QXxsKhNdwbsNMmbXgh0WA) — R$ 550,00/ano
        new PlanSeed(
            Name: "Pro Anual",
            Description: "Todos os módulos, limites ilimitados, cobrança anual — economia de 2 meses.",
            ExternalProductId: "prod_k53QXxsKhNdwbsNMmbXgh0WA",
            PriceCents: 55000,
            TrialDays: null,
            Entitlements: ProEntitlements,
            Limits: ProLimits,
            SupportsCard: true,
            SupportsPix: true,
            DisplayOrder: 7,
            BillingPeriod: BillingPeriod.Annual),
    ];
}

public record PlanSeed(
    string Name,
    string? Description,
    string ExternalProductId,
    int PriceCents,
    int? TrialDays,
    IReadOnlyList<string> Entitlements,
    IReadOnlyDictionary<string, int> Limits,
    bool SupportsCard,
    bool SupportsPix,
    int DisplayOrder,
    BillingPeriod BillingPeriod = BillingPeriod.Monthly,
    string Slug = "");
