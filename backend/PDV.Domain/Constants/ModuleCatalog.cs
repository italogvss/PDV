using PDV.Domain.Enums;

namespace PDV.Domain.Constants;

// Fonte ÚNICA da relação módulo → permissões (eixo de Access Control / UI).
// Exposta ao frontend via GET /api/access/metadata para alimentar a matriz de permissões
// (Funcionários) e a tela de Operação. Adicionar um módulo ou permissão = mudar aqui (+ o enum).
public static class ModuleCatalog
{
    public static readonly IReadOnlyDictionary<OperationModule, IReadOnlyList<Permission>> ModulePermissions =
        new Dictionary<OperationModule, IReadOnlyList<Permission>>
        {
            [OperationModule.Sales] = [Permission.SellProducts, Permission.CancelSales, Permission.ViewSalesHistory],
            [OperationModule.Inventory] = [Permission.ViewStock, Permission.ManageStock],
            [OperationModule.Services] = [],
            [OperationModule.Appointments] = [Permission.ManageAppointments, Permission.ViewAppointments],
            [OperationModule.Expenses] = [Permission.ViewExpenses, Permission.ManageExpenses],
            [OperationModule.Reports] = [Permission.ViewReports],
            [OperationModule.Customers] = [Permission.ManageCustomers, Permission.ViewCustomers],
            [OperationModule.Suppliers] = [Permission.ManageSuppliers, Permission.ViewSuppliers],
            [OperationModule.Logs] = [Permission.ViewLogs],
        };

    // Permissões que não pertencem a nenhum módulo — sempre visíveis (ex.: gestão de equipe),
    // independente dos módulos ativos do tenant.
    public static readonly IReadOnlyList<Permission> CorePermissions =
        [Permission.ManageEmployees, Permission.ViewEmployees];
}
