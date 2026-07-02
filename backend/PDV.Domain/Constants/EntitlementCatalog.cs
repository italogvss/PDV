using PDV.Domain.Enums;

namespace PDV.Domain.Constants;

// Fonte ÚNICA das capabilities booleanas de plano (eixo de billing). Unifica "módulo" (coarse) e
// "feature" (fine) num só conjunto de chaves — persistidas na lista `Plan.EntitledModulesJson`.
// Um plano concede a chave = a capability está liberada; ausência = 402 no enforcement.
//
// Modelo definitivo dos planos: AMBOS os planos concedem todos os MÓDULOS (módulo não é mais
// diferencial de plano — mantém [RequireModule] funcionando). O diferencial Essencial × Pro são
// as 9 FEATURES abaixo (só o Pro) + os limites numéricos (PlanLimits).
//
// Adicionar um novo gate = adicionar UMA const + UMA entrada em All + atribuir aos planos no
// PlanSeedData. NÃO confundir com PlanLimits (eixo numérico) nem com o eixo de Access Control do
// tenant (OperationModule/ModuleCatalog/TenantSettings) — este catálogo é billing.
public static class EntitlementCatalog
{
    // ── Módulos (coarse) — chave == OperationModule em lowercase. Concedidos a AMBOS os planos ──
    public const string Sales = "sales";
    public const string Inventory = "inventory";
    public const string Services = "services";
    public const string Appointments = "appointments";
    public const string Expenses = "expenses";
    public const string Reports = "reports";
    public const string Customers = "customers";
    public const string Suppliers = "suppliers";
    public const string Logs = "logs";
    public const string Employees = "employees";

    // ── Features (fine) — diferencial do plano Pro (chaves canônicas do produto) ────────────
    public const string AdvancedDashboard = "advancedDashboard";
    public const string ProductWithPhoto = "productWithPhoto";
    public const string ProductLinkedToService = "productLinkedToService";
    public const string RecurringExpense = "recurringExpense";
    public const string CustomRoles = "customRoles";
    public const string AdvancedReports = "advancedReports";
    public const string InformativeCustomerData = "informativeCustomerData";
    public const string CustomerSettings = "customerSettings";
    public const string CustomDiscountPercentage = "customDiscountPercentage";
    public const string AdvancedInventory = "advancedInventory";

    public const string AdvancedEmployee = "advancedEmployee";

    public const string Notifications = "notifications";  

    public const string AdvancedExpanses = "advancedExpanses";

    public record EntitlementInfo(string Key, string Label, string Group, bool IsModule);

    // Todas as chaves de MÓDULO (concedidas aos dois planos).
    public static readonly IReadOnlyList<string> Modules =
    [
        Sales, Inventory, Services, Appointments, Expenses,
        Reports, Customers, Suppliers, Logs, Employees,
    ];

    // Todas as FEATURES (concedidas só ao Pro).
    public static readonly IReadOnlyList<string> Features =
    [
        AdvancedDashboard, ProductWithPhoto, ProductLinkedToService, RecurringExpense,
        CustomRoles, AdvancedReports, InformativeCustomerData, CustomerSettings,
        CustomDiscountPercentage, Notifications, AdvancedInventory, AdvancedEmployee, AdvancedExpanses
    ];

    // Catálogo declarativo — rótulos PT-BR para a UI de Assinatura. Ordem = ordem de exibição.
    public static readonly IReadOnlyList<EntitlementInfo> All =
    [
        new(Sales, "Vendas / PDV", "Vendas", IsModule: true),
        new(Inventory, "Estoque", "Estoque", IsModule: true),
        new(Services, "Serviços", "Serviços", IsModule: true),
        new(Appointments, "Agendamentos", "Agendamentos", IsModule: true),
        new(Expenses, "Despesas", "Despesas", IsModule: true),
        new(Reports, "Relatórios", "Relatórios", IsModule: true),
        new(Customers, "Clientes", "Clientes", IsModule: true),
        new(Suppliers, "Fornecedores", "Fornecedores", IsModule: true),
        new(Logs, "Logs / Auditoria", "Auditoria", IsModule: true),
        new(Employees, "Funcionários", "Equipe", IsModule: true),

        new(AdvancedDashboard, "Painel analítico", "Dashboard", IsModule: false),
        new(ProductWithPhoto, "Produto com foto", "Estoque", IsModule: false),
        new(ProductLinkedToService, "Produto vinculado a serviço", "Serviços", IsModule: false),
        new(RecurringExpense, "Despesa recorrente", "Despesas", IsModule: false),
        new(CustomRoles, "Cargos personalizados", "Equipe", IsModule: false),
        new(AdvancedReports, "Relatórios avançados", "Relatórios", IsModule: false),
        new(InformativeCustomerData, "Dados analíticos do cliente", "Clientes", IsModule: false),
        new(CustomerSettings, "Configurações de cliente", "Clientes", IsModule: false),
        new(CustomDiscountPercentage, "Percentual de desconto personalizado", "Vendas", IsModule: false),
        new(Notifications, "Notificações", "Notificações", IsModule: false)
    ];

    private static readonly HashSet<string> KnownKeys =
        All.Select(e => e.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);

    // Chave de entitlement de um módulo (coarse). Mantém [RequireModule] compatível.
    public static string ForModule(OperationModule module) => module.ToString().ToLowerInvariant();

    public static bool IsKnown(string key) => KnownKeys.Contains(key);
}
