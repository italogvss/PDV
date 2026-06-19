using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.DTOs.Services;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/services")]
[Authorize]
[RequireModule(OperationModule.Services)]
public class ServicesController(IServiceService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? name = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortOrder = null)
    {
        var result = await service.GetAllAsync(page, pageSize, name, categoryId, sortBy, sortOrder);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> Create([FromBody] CreateServiceRequest request)
    {
        var result = await service.CreateAsync(request);
        return Created($"/api/services/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateServiceRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await service.DeleteAsync(id);
        return NoContent();
    }

    [HttpDelete("all")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> PurgeAll()
    {
        var deleted = await service.PurgeAllAsync();
        return Ok(new { deleted });
    }

    [HttpGet("inactive")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> GetInactive()
    {
        var result = await service.GetAllInactiveAsync();
        return Ok(result);
    }

    [HttpPatch("{id:guid}/restore")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> Restore(Guid id)
    {
        await service.RestoreAsync(id);
        return NoContent();
    }

    [HttpDelete("{id:guid}/permanent")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> HardDelete(Guid id)
    {
        await service.HardDeleteAsync(id);
        return NoContent();
    }
}
