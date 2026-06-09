using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.DTOs.ProductCategories;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/product-categories")]
[Authorize]
public class ProductCategoriesController(IProductCategoryService service) : ControllerBase
{
    [HttpGet]
    [RequirePermission(Permission.ViewStock)]
    public async Task<IActionResult> GetAll()
    {
        var result = await service.GetAllAsync();
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
    public async Task<IActionResult> Create([FromBody] CreateProductCategoryRequest request)
    {
        var result = await service.CreateAsync(request);
        return Created($"/api/product-categories/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permission.ManageStock)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProductCategoryRequest request)
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
}
