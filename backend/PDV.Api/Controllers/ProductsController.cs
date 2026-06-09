using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.DTOs.Products;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController(IProductService service) : ControllerBase
{
    [HttpGet]
    [RequirePermission(Permission.ViewStock)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? name = null,
        [FromQuery] string? barcode = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortOrder = null)
    {
        var result = await service.GetAllAsync(page, pageSize, name, barcode, categoryId, sortBy, sortOrder);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permission.ViewStock)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPost]
    [RequirePermission(Permission.ManageStock)]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest request)
    {
        var result = await service.CreateAsync(request);
        return Created($"/api/products/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permission.ManageStock)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProductRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permission.ManageStock)]
    public async Task<IActionResult> Delete(Guid id)
    {
        await service.DeleteAsync(id);
        return NoContent();
    }

    [HttpPatch("{id:guid}/stock")]
    [RequirePermission(Permission.ManageStock)]
    public async Task<IActionResult> AdjustStock(Guid id, [FromBody] AdjustStockRequest request)
    {
        var result = await service.AdjustStockAsync(id, request);
        return Ok(result);
    }
}
