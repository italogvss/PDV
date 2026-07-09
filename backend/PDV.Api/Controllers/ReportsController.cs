using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
using PDV.Domain.Enums;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
[RequireModule(OperationModule.Reports)]
[RequireEntitlement(EntitlementCatalog.AdvancedReports)]
[RequirePermission(Permission.ViewReports)]
public class ReportsController(IReportService service) : ControllerBase
{
    [HttpGet("sales")]
    public async Task<IActionResult> GetSalesMetrics(
        [FromQuery] string? period,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var result = await service.GetSalesMetricsAsync(period, startDate, endDate);
        return Ok(result);
    }

    [HttpGet("sales/by-operator")]
    public async Task<IActionResult> GetSalesByOperator(
        [FromQuery] string? period,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var result = await service.GetSalesByOperatorAsync(period, startDate, endDate);
        return Ok(result);
    }

    [HttpGet("financial-summary")]
    public async Task<IActionResult> GetFinancialSummary(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] string groupBy = "month",
        [FromQuery] string expenseBasis = "accrual")
    {
        var result = await service.GetFinancialSummaryAsync(startDate, endDate, groupBy, expenseBasis);
        return Ok(result);
    }

    [HttpGet("sales/by-payment-method")]
    public async Task<IActionResult> GetSalesByPaymentMethod(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var result = await service.GetSalesByPaymentMethodAsync(startDate, endDate);
        return Ok(result);
    }

    [HttpGet("products/top")]
    public async Task<IActionResult> GetTopProducts(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] int limit = 10)
    {
        var result = await service.GetTopProductsAsync(startDate, endDate, limit);
        return Ok(result);
    }

    [HttpGet("customers/top")]
    public async Task<IActionResult> GetTopCustomers(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] int limit = 10)
    {
        var result = await service.GetTopCustomersAsync(startDate, endDate, limit);
        return Ok(result);
    }

    [HttpGet("expenses/by-category")]
    public async Task<IActionResult> GetExpensesByCategory(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var result = await service.GetExpensesByCategoryAsync(startDate, endDate);
        return Ok(result);
    }

    [HttpGet("revenue-by-type")]
    public async Task<IActionResult> GetRevenueByType(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var result = await service.GetRevenueByTypeAsync(startDate, endDate);
        return Ok(result);
    }

    [HttpGet("sales/export")]
    public async Task<IActionResult> ExportSalesCSV(
        [FromQuery] string? period,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var csv = await service.ExportSalesCsvAsync(period, startDate, endDate);
        return File(csv, "text/csv", "vendas.csv");
    }

    [HttpGet("sales/export/all")]
    public async Task<IActionResult> ExportAllSalesCSV()
    {
        var csv = await service.ExportAllSalesCsvAsync();
        return File(csv, "text/csv", "vendas.csv");
    }

    [HttpGet("employees")]
    public async Task<IActionResult> GetEmployeesList()
    {
        var result = await service.GetEmployeesListAsync();
        return Ok(result);
    }

    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomersList()
    {
        var result = await service.GetCustomersListAsync();
        return Ok(result);
    }

    [HttpGet("stock/export")]
    public async Task<IActionResult> ExportStockCSV()
    {
        var csv = await service.ExportStockCsvAsync();
        return File(csv, "text/csv", "estoque.csv");
    }

    [HttpGet("customers/export")]
    public async Task<IActionResult> ExportCustomersCSV()
    {
        var csv = await service.ExportCustomersCsvAsync();
        return File(csv, "text/csv", "clientes.csv");
    }

    [HttpGet("services/export")]
    public async Task<IActionResult> ExportServicesCSV()
    {
        var csv = await service.ExportServicesCsvAsync();
        return File(csv, "text/csv", "servicos.csv");
    }

    [HttpGet("expenses/export")]
    public async Task<IActionResult> ExportExpensesCSV()
    {
        var csv = await service.ExportExpensesCsvAsync();
        return File(csv, "text/csv", "despesas.csv");
    }

    [HttpGet("billing/export")]
    public async Task<IActionResult> ExportBillingCSV()
    {
        var csv = await service.ExportBillingCsvAsync();
        return File(csv, "text/csv", "faturamento.csv");
    }

    [HttpGet("team/export")]
    public async Task<IActionResult> ExportTeamCSV()
    {
        var csv = await service.ExportTeamCsvAsync();
        return File(csv, "text/csv", "equipe.csv");
    }

    [HttpGet("appointments/summary")]
    public async Task<IActionResult> GetAppointmentSummary(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] string groupBy = "day")
    {
        var result = await service.GetAppointmentSummaryAsync(startDate, endDate, groupBy);
        return Ok(result);
    }

    [HttpGet("appointments/top-services")]
    public async Task<IActionResult> GetTopServices(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] int limit = 10)
    {
        var result = await service.GetTopServicesAsync(startDate, endDate, limit);
        return Ok(result);
    }

    [HttpGet("appointments/by-employee")]
    public async Task<IActionResult> GetAppointmentsByEmployee(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var result = await service.GetAppointmentsByEmployeeAsync(startDate, endDate);
        return Ok(result);
    }

    [HttpGet("appointments/by-category")]
    public async Task<IActionResult> GetServiceCategoryRevenue(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var result = await service.GetServiceCategoryRevenueAsync(startDate, endDate);
        return Ok(result);
    }

    [HttpGet("appointments/peak-hours")]
    public async Task<IActionResult> GetAppointmentPeakHours(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var result = await service.GetAppointmentPeakHoursAsync(startDate, endDate);
        return Ok(result);
    }
}
