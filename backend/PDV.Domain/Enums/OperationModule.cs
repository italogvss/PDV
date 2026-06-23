namespace PDV.Domain.Enums;

// Módulos da operação que podem ser ativados/desativados por tenant.
// O conjunto ativo filtra o menu lateral e a matriz de permissões no frontend.
public enum OperationModule
{
    Sales,
    Inventory,
    Services,
    Appointments,
    Expenses,
    Reports,
    Customers,
    Suppliers,
    Logs,
}
