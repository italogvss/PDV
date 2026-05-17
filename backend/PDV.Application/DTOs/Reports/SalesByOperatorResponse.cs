namespace PDV.Application.DTOs.Reports;

public record SalesByOperatorResponse(
    Guid OperatorId,
    string OperatorName,
    int TotalSales,
    decimal TotalRevenue);
