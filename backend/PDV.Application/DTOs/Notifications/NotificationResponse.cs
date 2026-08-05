namespace PDV.Application.DTOs.Notifications;

public record NotificationResponse(
    StockNotifications Stock,
    FinancialNotifications Financial,
    AppointmentNotifications Appointments,
    CreditNotifications Credit);

public record StockNotifications(int OutOfStock, int CriticalStock, int LowStock, int NegativeStock);
public record FinancialNotifications(int OverdueExpenses, int UpcomingExpenses);
public record AppointmentNotifications(int TodayAppointments);

// Parcelas de crediário vencidas e a vencer nos próximos 8 dias — mesma janela das despesas.
public record CreditNotifications(int OverdueInstallments, int UpcomingInstallments);
