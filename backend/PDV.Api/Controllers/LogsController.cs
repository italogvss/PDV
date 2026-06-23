using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/logs")]
[Authorize]
[RequireModule(OperationModule.Logs)]
[RequirePermission(Permission.ViewLogs)]
public class LogsController(ILogService logService) : ControllerBase
{
    [HttpGet("stock-movements")]
    public async Task<IActionResult> GetStockMovements(
        [FromQuery] Guid? productId = null,
        [FromQuery] string? type = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var result = await logService.GetStockMovementsAsync(productId, type, from, to, page, pageSize);
        return Ok(result);
    }

    [HttpGet("price-history")]
    public async Task<IActionResult> GetPriceHistory(
        [FromQuery] Guid? productId = null,
        [FromQuery] Guid? serviceId = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var result = await logService.GetPriceHistoryAsync(productId, serviceId, from, to, page, pageSize);
        return Ok(result);
    }

    [HttpGet("appointment-status")]
    public async Task<IActionResult> GetAppointmentStatusLogs(
        [FromQuery] Guid? appointmentId = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var result = await logService.GetAppointmentStatusLogsAsync(appointmentId, from, to, page, pageSize);
        return Ok(result);
    }
}
