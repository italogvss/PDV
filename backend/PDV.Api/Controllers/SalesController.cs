using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.Sales;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;
using System.Security.Claims;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/sales")]
[Authorize]
public class SalesController(ISaleService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] Guid? operatorId = null,
        [FromQuery] string? status = null)
    {
        SaleStatus? saleStatus = status is not null && Enum.TryParse<SaleStatus>(status, true, out var parsed)
            ? parsed
            : null;

        var result = await service.GetAllAsync(page, pageSize, startDate, endDate, operatorId, saleStatus);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSaleRequest request)
    {
        var operatorId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await service.CreateAsync(request, operatorId);
        return Created($"/api/sales/{result.Id}", result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var adminId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await service.CancelAsync(id, adminId);
        return NoContent();
    }
}
