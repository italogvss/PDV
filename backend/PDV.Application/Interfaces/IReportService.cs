using PDV.Application.DTOs.Reports;

namespace PDV.Application.Interfaces;

public interface IReportService
{
    Task<List<FinancialSummaryPoint>> GetFinancialSummaryAsync(
        DateTime startDate, DateTime endDate, string groupBy, string expenseBasis);

    Task<SalesMetricsResponse> GetSalesMetricsAsync(
        string? period, DateTime? startDate, DateTime? endDate);

    Task<List<SalesByOperatorResponse>> GetSalesByOperatorAsync(
        string? period, DateTime? startDate, DateTime? endDate);

    Task<List<SalesByPaymentMethodResponse>> GetSalesByPaymentMethodAsync(
        DateTime startDate, DateTime endDate);

    Task<List<TopProductResponse>> GetTopProductsAsync(
        DateTime startDate, DateTime endDate, int limit);

    Task<List<TopCustomerResponse>> GetTopCustomersAsync(
        DateTime startDate, DateTime endDate, int limit);

    Task<List<ExpensesByCategoryResponse>> GetExpensesByCategoryAsync(
        DateTime startDate, DateTime endDate);

    Task<List<ReportEmployeeResponse>> GetEmployeesListAsync();

    Task<List<ReportCustomerResponse>> GetCustomersListAsync();

    Task<byte[]> ExportSalesCsvAsync(
        string? period, DateTime? startDate, DateTime? endDate);

    Task<byte[]> ExportAllSalesCsvAsync();

    Task<byte[]> ExportStockCsvAsync();

    Task<byte[]> ExportCustomersCsvAsync();

    Task<byte[]> ExportServicesCsvAsync();

    Task<byte[]> ExportExpensesCsvAsync();

    Task<byte[]> ExportBillingCsvAsync();

    Task<byte[]> ExportTeamCsvAsync();

    Task<RevenueByTypeResponse> GetRevenueByTypeAsync(DateTime startDate, DateTime endDate);

    Task<byte[]> ExportForTenantAsync(Guid tenantId, string category);

    Task<List<AppointmentSummaryPoint>> GetAppointmentSummaryAsync(
        DateTime startDate, DateTime endDate, string groupBy);

    Task<List<TopServiceResponse>> GetTopServicesAsync(
        DateTime startDate, DateTime endDate, int limit);

    Task<List<AppointmentsByEmployeeResponse>> GetAppointmentsByEmployeeAsync(
        DateTime startDate, DateTime endDate);

    Task<List<ServiceCategoryRevenueResponse>> GetServiceCategoryRevenueAsync(
        DateTime startDate, DateTime endDate);

    Task<List<AppointmentPeakHourResponse>> GetAppointmentPeakHoursAsync(
        DateTime startDate, DateTime endDate);
}
