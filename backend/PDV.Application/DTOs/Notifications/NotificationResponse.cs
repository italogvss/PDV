namespace PDV.Application.DTOs.Notifications;

public record NotificationResponse(
    StockNotifications Stock,
    FinancialNotifications Financial,
    AppointmentNotifications Appointments);

public record StockNotifications(int OutOfStock, int CriticalStock, int LowStock, int NegativeStock);
public record FinancialNotifications(int OverdueExpenses, int UpcomingExpenses);
public record AppointmentNotifications(int TodayAppointments);
