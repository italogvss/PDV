using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.DTOs.Suppliers;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/suppliers")]
[Authorize]
public class SuppliersController(ISupplierService service) : ControllerBase
{
    [HttpGet]
    [RequirePermission(Permission.ViewSuppliers)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null)
    {
        var result = await service.GetAllAsync(page, pageSize, search);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permission.ViewSuppliers)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPost]
    [RequirePermission(Permission.ManageSuppliers)]
    public async Task<IActionResult> Create([FromBody] CreateSupplierRequest request)
    {
        var result = await service.CreateAsync(request);
        return Created($"/api/suppliers/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permission.ManageSuppliers)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSupplierRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permission.ManageSuppliers)]
    public async Task<IActionResult> Delete(Guid id)
    {
        await service.DeleteAsync(id);
        return NoContent();
    }

    [HttpDelete("all")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> PurgeAll()
    {
        var deleted = await service.PurgeAllAsync();
        return Ok(new { deleted });
    }

    [HttpGet("inactive")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> GetInactive()
    {
        var result = await service.GetAllInactiveAsync();
        return Ok(result);
    }

    [HttpPatch("{id:guid}/restore")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Restore(Guid id)
    {
        await service.RestoreAsync(id);
        return NoContent();
    }

    [HttpDelete("{id:guid}/permanent")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> HardDelete(Guid id)
    {
        await service.HardDeleteAsync(id);
        return NoContent();
    }
}
