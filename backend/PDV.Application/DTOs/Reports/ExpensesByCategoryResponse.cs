namespace PDV.Application.DTOs.Reports;

public record ExpensesByCategoryResponse(
    string Category,
    decimal Total,
    int Count);
