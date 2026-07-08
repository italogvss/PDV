namespace PDV.Application.DTOs.Reports;

public record AppointmentSummaryPoint(
    string Label,
    int Total,
    int Completed,
    int Cancelled,
    int InProgress,
    int Pending,
    decimal RevenueRealized,
    decimal RevenueTotal);
