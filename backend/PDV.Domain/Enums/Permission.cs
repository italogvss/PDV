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
}
