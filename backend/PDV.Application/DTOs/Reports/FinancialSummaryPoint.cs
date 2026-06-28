namespace PDV.Application.DTOs.Reports;

public record FinancialSummaryPoint(
    string Label,
    decimal Revenue,
    decimal Cost,
    decimal Fees,
    decimal Expenses,
    decimal GrossProfit,
    decimal NetResult);
