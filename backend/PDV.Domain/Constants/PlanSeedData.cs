using PDV.Domain.Enums;

namespace PDV.Domain.Constants;

// Definição declarativa dos planos pagos. O `PlanSeeder` faz upsert idempotente por
// `ExternalProductId`. Os produtos já existem no AbacatePay com o ciclo correto
// (MONTHLY ou ANNUAL) e trial configurado ou não.
//
// Os `ExternalProductId` (prod_...) abaixo são os ids reais do catálogo no AbacatePay
// (devMode). O nome legível do produto (plano-mensal, plano-anual-pro, ...) está no
// comentário de cada bloco.
public static class PlanSeedData
{
    private static readonly IReadOnlyList<OperationModule> StarterModules =
    [
        OperationModule.Sales,
        OperationModule.Inventory,
        OperationModule.Customers,
        OperationModule.Expenses,
    ];

    private static readonly IReadOnlyList<OperationModule> ProModules =
    [
        OperationModule.Sales,
        OperationModule.Inventory,
        OperationModule.Services,
        OperationModule.Appointments,
        OperationModule.Expenses,
        OperationModule.Reports,
        OperationModule.Customers,
        OperationModule.Suppliers,
    ];

    private static readonly IReadOnlyDictionary<string, int> StarterLimits = new Dictionary<string, int>
    {
        [PlanLimits.MaxEmployees] = 5,
        [PlanLimits.MaxProducts] = 100,
        [PlanLimits.MaxStorageMb] = 512,
    };

    private static readonly IReadOnlyDictionary<string, int> ProLimits = new Dictionary<string, int>
    {
        [PlanLimits.MaxEmployees] = PlanLimits.Unlimited,
        [PlanLimits.MaxProducts] = PlanLimits.Unlimited,
        [PlanLimits.MaxStorageMb] = PlanLimits.Unlimited,
    };

    public static readonly IReadOnlyList<PlanSeed> Plans =
    [
        // ── Starter Mensal ───────────────────────────────────────────────────────────
        // AbacatePay: plano-mensal (prod_kNUahnCQuYUMAU6CM4HJg1dg) — R$ 35,00/mês
        new PlanSeed(
            Name: "Starter Mensal",
            Description: "Essencial para começar: vendas, estoque, clientes e despesas.",
            ExternalProductId: "prod_kNUahnCQuYUMAU6CM4HJg1dg",
            PriceCents: 3500,
            TrialDays: null,
            Modules: StarterModules,
            Limits: StarterLimits,
            SupportsCard: true,
            SupportsPix: false,
            BillingPeriod: BillingPeriod.Monthly,
            DisplayOrder: 1),

        // AbacatePay: plano-mensal-trial (prod_KcEKStwwfp4wKz4upw4JKWby) — R$ 35,00/mês, 30 dias grátis
        new PlanSeed(
            Name: "Starter Mensal (Trial)",
            Description: "Starter mensal com 30 dias grátis para conhecer a plataforma.",
            ExternalProductId: "prod_KcEKStwwfp4wKz4upw4JKWby",
            PriceCents: 3500,
            TrialDays: 30,
            Modules: StarterModules,
            Limits: StarterLimits,
            SupportsCard: true,
            SupportsPix: false,
            BillingPeriod: BillingPeriod.Monthly,
            DisplayOrder: 2),

        // ── Starter Anual ────────────────────────────────────────────────────────────
        // AbacatePay: plano-anual (prod_ggDACnfD3rbfSdmBuFa3Sd0G) — R$ 375,00/ano
        new PlanSeed(
            Name: "Starter Anual",
            Description: "Starter com cobrança anual — economia de 2 meses.",
            ExternalProductId: "prod_ggDACnfD3rbfSdmBuFa3Sd0G",
            PriceCents: 37500,
            TrialDays: null,
            Modules: StarterModules,
            Limits: StarterLimits,
            SupportsCard: true,
            SupportsPix: true,
            DisplayOrder: 3,
            BillingPeriod: BillingPeriod.Annual),

        // AbacatePay: plano-anual-trial (prod_DwAeCJwZZErr52mfbE1LGsur) — R$ 375,00/ano, 30 dias grátis
        new PlanSeed(
            Name: "Starter Anual (Trial)",
            Description: "Starter anual com 30 dias grátis para conhecer a plataforma.",
            ExternalProductId: "prod_DwAeCJwZZErr52mfbE1LGsur",
            PriceCents: 37500,
            TrialDays: 30,
            Modules: StarterModules,
            Limits: StarterLimits,
            SupportsCard: true,
            SupportsPix: false,
            DisplayOrder: 4,
            BillingPeriod: BillingPeriod.Annual),

        // ── Pro Mensal ───────────────────────────────────────────────────────────────
        // AbacatePay: plano-mensal-pro (prod_WprrUe0bPSghwptpJSCEc2rY) — R$ 50,00/mês
        new PlanSeed(
            Name: "Pro Mensal",
            Description: "Todos os módulos, limites ilimitados, cobrança mensal.",
            ExternalProductId: "prod_WprrUe0bPSghwptpJSCEc2rY",
            PriceCents: 5000,
            TrialDays: null,
            Modules: ProModules,
            Limits: ProLimits,
            SupportsCard: true,
            SupportsPix: false,
            DisplayOrder: 5,
            BillingPeriod: BillingPeriod.Monthly),

        // AbacatePay: plano-mensal-pro-trial (prod_NgQAKNrQ52uwbt12Jr11rKQJ) — R$ 50,00/mês, 30 dias grátis
        new PlanSeed(
            Name: "Pro Mensal (Trial)",
            Description: "Pro mensal com 30 dias grátis para conhecer a plataforma.",
            ExternalProductId: "prod_NgQAKNrQ52uwbt12Jr11rKQJ",
            PriceCents: 5000,
            TrialDays: 30,
            Modules: ProModules,
            Limits: ProLimits,
            SupportsCard: true,
            SupportsPix: false,
            DisplayOrder: 6),

        // ── Pro Anual ────────────────────────────────────────────────────────────────
        // AbacatePay: plano-anual-pro (prod_k53QXxsKhNdwbsNMmbXgh0WA) — R$ 550,00/ano
        new PlanSeed(
            Name: "Pro Anual",
            Description: "Todos os módulos, limites ilimitados, cobrança anual — economia de 2 meses.",
            ExternalProductId: "prod_k53QXxsKhNdwbsNMmbXgh0WA",
            PriceCents: 55000,
            TrialDays: null,
            Modules: ProModules,
            Limits: ProLimits,
            SupportsCard: true,
            SupportsPix: true,
            DisplayOrder: 7,
            BillingPeriod: BillingPeriod.Annual),

        // AbacatePay: plano-anual-pro-trial (prod_Wp0TwpTT6UujPA6mygqnbrjA) — R$ 550,00/ano, 30 dias grátis
        new PlanSeed(
            Name: "Pro Anual (Trial)",
            Description: "Pro anual com 30 dias grátis para conhecer a plataforma.",
            ExternalProductId: "prod_Wp0TwpTT6UujPA6mygqnbrjA",
            PriceCents: 55000,
            TrialDays: 30,
            Modules: ProModules,
            Limits: ProLimits,
            SupportsCard: true,
            SupportsPix: false,
            DisplayOrder: 8,
            BillingPeriod: BillingPeriod.Annual),
    ];
}

public record PlanSeed(
    string Name,
    string? Description,
    string ExternalProductId,
    int PriceCents,
    int? TrialDays,
    IReadOnlyList<OperationModule> Modules,
    IReadOnlyDictionary<string, int> Limits,
    bool SupportsCard,
    bool SupportsPix,
    int DisplayOrder,
    BillingPeriod BillingPeriod = BillingPeriod.Monthly);
