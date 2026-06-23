using PDV.Domain.Enums;

namespace PDV.Domain.Constants;

// Conjunto padrão de módulos da operação por segmento, aplicado na criação do tenant.
// Depois o Owner pode ativar/desativar livremente em Configurações → Operação.
public static class SegmentModuleDefaults
{
    public static readonly OperationModule[] All =
        Enum.GetValues<OperationModule>();

    private static readonly OperationModule[] Retail =
    [
        OperationModule.Sales,
        OperationModule.Inventory,
        OperationModule.Expenses,
        OperationModule.Reports,
        OperationModule.Customers,
        OperationModule.Suppliers,
        OperationModule.Logs,
    ];

    private static readonly Dictionary<Segment, OperationModule[]> Map = new()
    {
        [Segment.Cafeteria]   = Retail,
        [Segment.Restaurante] = Retail,
        [Segment.Mercado]     = Retail,
        [Segment.Varejo]      = Retail,
        [Segment.Farmacia]    = Retail,
        [Segment.Vestuario]   = Retail,
        [Segment.Eletronicos] = Retail,
        [Segment.Servicos]    =
        [
            OperationModule.Services,
            OperationModule.Appointments,
            OperationModule.Sales,
            OperationModule.Expenses,
            OperationModule.Reports,
            OperationModule.Customers,
            OperationModule.Logs,
        ],
        [Segment.Outro]       = All,
    };

    public static OperationModule[] ForSegment(Segment segment) =>
        Map.TryGetValue(segment, out var modules) ? modules : All;
}
