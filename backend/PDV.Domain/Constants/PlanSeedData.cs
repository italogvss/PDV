using PDV.Domain.Enums;

namespace PDV.Domain.Constants;

// Definição declarativa dos planos pagos. O `PlanSeeder` faz upsert idempotente por
// `ExternalProductId`. Os produtos já devem existir no AbacatePay (com ciclo MONTHLY para
// permitir assinatura por cartão) — aqui apenas vinculamos o id e definimos a lógica de
// negócio (módulos + limites) que NÃO vive no gateway.
//
// ⚠️ Substitua os `ExternalProductId` (prod_...) pelos ids reais do seu catálogo no AbacatePay.
public static class PlanSeedData
{
    public static readonly IReadOnlyList<PlanSeed> Plans =
    [
        new PlanSeed(
            Name: "Starter",
            Description: "Para quem está começando a organizar o negócio.",
            ExternalProductId: "prod_starter",
            PriceMonthlyCents: 4990,
            PriceAnnualCents: 49900,
            TrialDays: 7,
            Modules:
            [
                OperationModule.Sales,
                OperationModule.Inventory,
                OperationModule.Expenses,
                OperationModule.Customers,
            ],
            Limits: new Dictionary<string, int>
            {
                [PlanLimits.MaxEmployees] = 3,
                [PlanLimits.MaxProducts] = 300,
                [PlanLimits.MaxStorageMb] = 1024,
            },
            SupportsCard: true,
            SupportsPix: true,
            DisplayOrder: 1),

        new PlanSeed(
            Name: "Pro",
            Description: "Operação completa, sem limites práticos.",
            ExternalProductId: "prod_pro",
            PriceMonthlyCents: 9990,
            PriceAnnualCents: 99900,
            TrialDays: 7,
            Modules:
            [
                OperationModule.Sales,
                OperationModule.Inventory,
                OperationModule.Services,
                OperationModule.Appointments,
                OperationModule.Expenses,
                OperationModule.Reports,
                OperationModule.Customers,
                OperationModule.Suppliers,
            ],
            Limits: new Dictionary<string, int>
            {
                [PlanLimits.MaxEmployees] = PlanLimits.Unlimited,
                [PlanLimits.MaxProducts] = PlanLimits.Unlimited,
                [PlanLimits.MaxStorageMb] = PlanLimits.Unlimited,
            },
            SupportsCard: true,
            SupportsPix: true,
            DisplayOrder: 2),
    ];
}

public record PlanSeed(
    string Name,
    string? Description,
    string ExternalProductId,
    int PriceMonthlyCents,
    int? PriceAnnualCents,
    int? TrialDays,
    IReadOnlyList<OperationModule> Modules,
    IReadOnlyDictionary<string, int> Limits,
    bool SupportsCard,
    bool SupportsPix,
    int DisplayOrder);
