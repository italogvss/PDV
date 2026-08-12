namespace PDV.Domain.Enums;

public enum Permission
{
    //sales
    SellProducts,
    CancelSales,
    ViewStock,
    ManageStock,
    ViewSalesHistory,

    //expenses
    ViewExpenses,
    ManageExpenses,

    //reports
    ViewReports,

    //employees
    ManageEmployees,
    ViewEmployees,

    //appointment and services
    ManageAppointments,
    ViewAppointments,

    //customers
    ManageCustomers,
    ViewCustomers,

    //supliers
    ManageSuppliers,
    ViewSuppliers,
    ViewLogs,

    //services
    ViewServices,
    ManageServices,

    // ATENÇÃO: este enum é persistido como int em TenantRolePermission — inserir um valor no MEIO
    // reordena os seguintes e corrompe os cargos já salvos. Permissão nova vai SEMPRE no fim.

    //credit (crediário)
    ViewCredit,
    ManageCredit,

    // Ações que DESFAZEM dinheiro (cancelar a conta, estornar um recebimento) ficam separadas
    // de ManageCredit: quem recebe no balcão não precisa poder apagar o que já foi recebido.
    CancelCredit,
}
