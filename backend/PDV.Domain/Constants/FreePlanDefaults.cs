using PDV.Domain.Enums;

namespace PDV.Domain.Constants;

// Plano Free NÃO existe como entidade. Quando o Owner não tem assinatura viva, este é o
// conjunto de módulos + limites aplicado ao tenant. Ponto único de configuração — ajuste aqui.
public static class FreePlanDefaults
{
    public const string Name = "Gratuito";

    public static readonly IReadOnlyList<OperationModule> Modules =
    [
        OperationModule.Sales,
        OperationModule.Inventory,
    ];

    public static readonly IReadOnlyDictionary<string, int> Limits = new Dictionary<string, int>
    {
        [PlanLimits.MaxEmployees] = 1,
        [PlanLimits.MaxProducts] = 30,
        [PlanLimits.MaxStorageMb] = 100,
    };
}
