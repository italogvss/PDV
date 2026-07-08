namespace PDV.Application.DTOs.Reports;

public record ServiceCategoryRevenueResponse(
    string Category,
    decimal Total,
    string? Color);
