namespace PDV.Application.DTOs.Employees;

public record EmployeePerformanceStatsResponse(
    decimal SalesThisMonth,
    int SalesCountThisMonth,
    int AppointmentsThisMonth,
    EmployeeCancellationDto Cancellation,
    decimal? MonthlySalary,
    IEnumerable<EmployeeDailySalesDto> DailySales,
    IEnumerable<EmployeeDailyAppointmentsDto> DailyAppointments
);

// Taxa de cancelamento: o frontend escolhe entre o mês corrente e o histórico via toggle.
public record EmployeeCancellationDto(int MonthCancelled, int MonthTotal, int TotalCancelled, int Total);

// Séries diárias esparsas (somente dias com atividade) dos últimos 365 dias.
// Date no formato "yyyy-MM-dd"; o frontend agrega por granularidade (dia/semana/mês).
public record EmployeeDailySalesDto(string Date, decimal Total, int Count);

public record EmployeeDailyAppointmentsDto(
    string Date,
    int Completed,
    int Cancelled,
    int InProgress,
    int Scheduled
);
