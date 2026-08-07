using Microsoft.EntityFrameworkCore;
using PDV.Domain.Constants;
using PDV.Domain.Enums;

namespace PDV.Infrastructure.Services.Notifications;

// Tabela ÚNICA de regras do motor de notificações. Adicionar uma notificação nova é
// acrescentar uma linha aqui (+ a const em NotificationCatalog e a entrada no mapa do
// frontend). O NotificationService não conhece nenhuma regra em particular — ele só
// aplica o gating e executa a contagem.
internal static class NotificationRules
{
    public static readonly IReadOnlyList<NotificationRule> All =
    [
        // ---------- Estoque ----------

        // Sem estoque e estoque negativo valem mesmo sem controle de mínimo ligado:
        // são fatos sobre a quantidade, não sobre um limiar configurado.
        new(NotificationCatalog.StockOut,
            OperationModule.Inventory,
            s => s.NotifyStockAlerts,
            [Permission.ViewStock],
            ctx => ctx.Db.Products.CountAsync(p => p.Stock == 0)),

        new(NotificationCatalog.StockNegative,
            OperationModule.Inventory,
            s => s.NotifyStockAlerts,
            [Permission.ViewStock],
            ctx => ctx.Db.Products.CountAsync(p => p.Stock < 0)),

        // Crítico e baixo dependem dos limiares — se a loja desligou o controle de estoque
        // mínimo, os valores antigos de MinStock/MinCriticalStock não devem mais alertar.
        new(NotificationCatalog.StockCritical,
            OperationModule.Inventory,
            s => s.NotifyStockAlerts,
            [Permission.ViewStock],
            ctx => ctx.InventoryControlEnabled
                ? ctx.Db.Products.CountAsync(p =>
                    p.MinCriticalStock != null && p.Stock > 0 && p.Stock <= p.MinCriticalStock)
                : Task.FromResult(0)),

        // "Baixo" exclui quem já está em "crítico" — as faixas não se sobrepõem, senão o
        // mesmo produto apareceria em duas notificações.
        new(NotificationCatalog.StockLow,
            OperationModule.Inventory,
            s => s.NotifyStockAlerts,
            [Permission.ViewStock],
            ctx => ctx.InventoryControlEnabled
                ? ctx.Db.Products.CountAsync(p =>
                    p.MinStock != null && p.Stock > 0 && p.Stock <= p.MinStock
                    && (p.MinCriticalStock == null || p.Stock > p.MinCriticalStock))
                : Task.FromResult(0)),

        // ---------- Despesas ----------

        new(NotificationCatalog.ExpensesOverdue,
            OperationModule.Expenses,
            s => s.NotifyInvoices,
            [Permission.ViewExpenses],
            ctx => ctx.Db.Expenses.CountAsync(e => !e.IsPaid && e.DueDate < ctx.Today)),

        new(NotificationCatalog.ExpensesDueToday,
            OperationModule.Expenses,
            s => s.NotifyInvoices,
            [Permission.ViewExpenses],
            ctx => ctx.Db.Expenses.CountAsync(e =>
                !e.IsPaid && e.DueDate >= ctx.Today && e.DueDate < ctx.Tomorrow)),

        // ---------- Agendamentos ----------

        // Cancelado fora da conta: o lojista não tem nada a fazer com ele hoje.
        new(NotificationCatalog.AppointmentsToday,
            OperationModule.Appointments,
            s => s.NotifyAppointments,
            [Permission.ViewAppointments],
            ctx => ctx.Db.Appointments.CountAsync(a =>
                a.Start >= ctx.Today && a.Start < ctx.Tomorrow
                && a.Status != AppointmentStatus.Cancelado)),

        // TODO (crediário): ver NotificationCatalog. Quando feature/crediario-portal-stripe
        // entrar na master, acrescentar aqui as duas regras — módulo OperationModule.Credit,
        // pref s => s.NotifyCredit (coluna nova em UserSettings), permissão Permission.ViewCredit
        // — e um NextMonthStart em NotificationContext (1º dia do mês seguinte, limite exclusivo):
        //
        //   CreditOverdue:      i.Status == Open && i.DueDate < ctx.Today
        //   CreditDueThisMonth: i.Status == Open && i.DueDate >= ctx.Today && i.DueDate < ctx.NextMonthStart
    ];
}
