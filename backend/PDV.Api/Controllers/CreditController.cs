using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.DTOs.Credit;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/credit")]
[Authorize]
[RequireModule(OperationModule.Credit)]
public class CreditController(ICreditService service) : ControllerBase
{
    [HttpGet("accounts")]
    [RequirePermission(Permission.ViewCredit, Permission.ManageCredit)]
    public async Task<IActionResult> GetAccounts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? customerId = null,
        [FromQuery] string? status = null,
        [FromQuery] bool? overdue = null,
        [FromQuery] string? dueFrom = null,
        [FromQuery] string? dueTo = null,
        [FromQuery] string? search = null)
    {
        var filter = BuildFilter(customerId, status, overdue, dueFrom, dueTo, search);
        return Ok(await service.GetAccountsAsync(filter, page, pageSize));
    }

    [HttpGet("accounts/{id:guid}")]
    [RequirePermission(Permission.ViewCredit, Permission.ManageCredit)]
    public async Task<IActionResult> GetAccount(Guid id) =>
        Ok(await service.GetAccountAsync(id));

    // Abre o crediário de uma venda já existente. É o mesmo contrato que o fluxo de venda vai
    // usar quando o PDV for reformulado — a conta nunca nasce solta, sempre a partir de uma Sale.
    [HttpPost("accounts")]
    [RequirePermission(Permission.ManageCredit)]
    public async Task<IActionResult> CreateAccount([FromBody] CreateCreditAccountRequest request)
    {
        var result = await service.CreateForSaleAsync(request);
        return Created($"/api/credit/accounts/{result.Account.Id}", result);
    }

    [HttpPatch("accounts/{id:guid}/cancel")]
    [RequirePermission(Permission.CancelCredit)]
    public async Task<IActionResult> CancelAccount(Guid id) =>
        Ok(await service.CancelAccountAsync(id));

    [HttpGet("installments")]
    [RequirePermission(Permission.ViewCredit, Permission.ManageCredit)]
    public async Task<IActionResult> GetInstallments(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? customerId = null,
        [FromQuery] string? status = null,
        [FromQuery] bool? overdue = null,
        [FromQuery] string? dueFrom = null,
        [FromQuery] string? dueTo = null,
        [FromQuery] string? search = null)
    {
        var filter = BuildFilter(customerId, status, overdue, dueFrom, dueTo, search);
        return Ok(await service.GetInstallmentsAsync(filter, page, pageSize));
    }

    [HttpPost("installments/{id:guid}/receive")]
    [RequirePermission(Permission.ManageCredit)]
    public async Task<IActionResult> Receive(Guid id, [FromBody] ReceiveInstallmentRequest request) =>
        Ok(await service.ReceiveAsync(id, request));

    // Estorno apaga um recebimento — mesma família de risco do cancelamento, mesma permissão.
    [HttpDelete("payments/{id:guid}")]
    [RequirePermission(Permission.CancelCredit)]
    public async Task<IActionResult> Reverse(Guid id)
    {
        await service.ReverseAsync(id);
        return NoContent();
    }

    [HttpGet("summary")]
    [RequirePermission(Permission.ViewCredit, Permission.ManageCredit)]
    public async Task<IActionResult> GetSummary() =>
        Ok(await service.GetSummaryAsync());

    // Painel analítico do crediário — feature Pro. O gate vive no service porque o mesmo
    // método também é chamado internamente pelos KPIs.
    [HttpGet("aging")]
    [RequirePermission(Permission.ViewCredit, Permission.ManageCredit)]
    [RequireEntitlement(EntitlementCatalog.CreditDashboard)]
    public async Task<IActionResult> GetAging() =>
        Ok(await service.GetAgingAsync());

    [HttpGet("installments/{id:guid}/reminder")]
    [RequirePermission(Permission.ViewCredit, Permission.ManageCredit)]
    [RequireEntitlement(EntitlementCatalog.CreditReminders)]
    public async Task<IActionResult> GetReminder(Guid id) =>
        Ok(await service.GetReminderAsync(id));

    private static CreditFilter BuildFilter(
        Guid? customerId, string? status, bool? overdue, string? dueFrom, string? dueTo, string? search)
    {
        CreditAccountStatus? parsedStatus = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<CreditAccountStatus>(status, ignoreCase: true, out var value))
                throw new BusinessException("Status inválido. Use: Open, Paid ou Cancelled.");
            parsedStatus = value;
        }

        return new CreditFilter(
            customerId,
            parsedStatus,
            overdue,
            ParseDate(dueFrom),
            ParseDate(dueTo),
            search);
    }

    // TryParse, não Parse: FormatException não herda de AppException, então uma data malformada
    // no querystring virava 500 em vez do 400 que o resto do filtro já devolve.
    private static DateTime? ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (!DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            throw new BusinessException($"Data inválida: '{value}'. Use o formato aaaa-mm-dd.");

        return parsed.Date;
    }
}
