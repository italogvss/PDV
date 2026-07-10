using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Api.Controllers;

// Exportação de dados. Separada do ReportsController de propósito: precisa continuar acessível
// quando o plano expira, é cancelado ou nunca existiu — é assim que o dono baixa seus dados dentro
// da janela de retenção (RetentionDefaults.DaysAfterAccessLoss) antes da exclusão definitiva.
// Por isso não carrega [RequireModule] nem [RequireEntitlement]; o gate é só de permissão.
// Compartilha o prefixo /api/reports para não quebrar as URLs já usadas pelo frontend.
[ApiController]
[Route("api/reports")]
[Authorize]
[RequirePermission(Permission.ViewReports)]
public class DataExportController(IReportService service) : ControllerBase
{
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
