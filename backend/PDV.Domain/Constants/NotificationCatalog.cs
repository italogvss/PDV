namespace PDV.Domain.Constants;

// Fonte ÚNICA das chaves de notificação in-app. O backend é dono das chaves e das regras
// (o que é verdade); o frontend espelha as chaves em constants/notifications.ts e é dono
// do ícone, da rota, da severidade e do texto PT-BR (como aquilo aparece).
//
// Adicionar uma notificação nova = 1 const aqui + 1 linha em NotificationRules.All
// (Infrastructure) + 1 entrada em NOTIFICATION_DEFS (frontend). Chave desconhecida pelo
// frontend é simplesmente ignorada, então o backend pode ir para produção primeiro.
public static class NotificationCatalog
{
    // Estoque
    public const string StockOut = "stock.out";
    public const string StockCritical = "stock.critical";
    public const string StockLow = "stock.low";
    public const string StockNegative = "stock.negative";

    // Despesas
    public const string ExpensesOverdue = "expenses.overdue";
    public const string ExpensesDueToday = "expenses.dueToday";

    // Agendamentos
    public const string AppointmentsToday = "appointments.today";

    // Crediário — parcelas Open com DueDate < hoje / no restante do mês corrente.
    public const string CreditOverdue = "credit.overdue";
    public const string CreditDueThisMonth = "credit.dueThisMonth";
}
