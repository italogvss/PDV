namespace PDV.Application.DTOs.Reports;

public record SalesMetricsResponse(
    int TotalSales,
    decimal TotalRevenue,
    decimal AverageTicket,
    int CancelledCount,
    string Period);
