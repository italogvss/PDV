using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
[RequireModule(OperationModule.Reports)]
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

    [HttpGet("sales/chart")]
    public async Task<IActionResult> GetSalesChart(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] string groupBy = "day")
    {
        var result = await service.GetSalesChartAsync(startDate, endDate, groupBy);
        return Ok(result);
    }

    [HttpGet("financial-summary")]
    public async Task<IActionResult> GetFinancialSummary(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] string groupBy = "month")
    {
        var result = await service.GetFinancialSummaryAsync(startDate, endDate, groupBy);
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

    [HttpGet("expenses/by-category")]
    public async Task<IActionResult> GetExpensesByCategory(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var result = await service.GetExpensesByCategoryAsync(startDate, endDate);
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

    [HttpGet("stock")]
    public async Task<IActionResult> GetStock()
    {
        var result = await service.GetStockSnapshotAsync();
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
}
