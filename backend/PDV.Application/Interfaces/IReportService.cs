using PDV.Application.DTOs.Reports;

namespace PDV.Application.Interfaces;

public interface IReportService
{
    Task<List<SalesChartPoint>> GetSalesChartAsync(
        DateTime startDate, DateTime endDate, string groupBy);

    Task<List<FinancialSummaryPoint>> GetFinancialSummaryAsync(
        DateTime startDate, DateTime endDate, string groupBy);

    Task<SalesMetricsResponse> GetSalesMetricsAsync(
        string? period, DateTime? startDate, DateTime? endDate);

    Task<List<SalesByOperatorResponse>> GetSalesByOperatorAsync(
        string? period, DateTime? startDate, DateTime? endDate);

    Task<List<SalesByPaymentMethodResponse>> GetSalesByPaymentMethodAsync(
        DateTime startDate, DateTime endDate);

    Task<List<TopProductResponse>> GetTopProductsAsync(
        DateTime startDate, DateTime endDate, int limit);

    Task<List<ExpensesByCategoryResponse>> GetExpensesByCategoryAsync(
        DateTime startDate, DateTime endDate);

    Task<List<StockSnapshotResponse>> GetStockSnapshotAsync();

    Task<byte[]> ExportSalesCsvAsync(
        string? period, DateTime? startDate, DateTime? endDate);

    Task<byte[]> ExportStockCsvAsync();
}
