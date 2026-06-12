using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.DTOs.Employees;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/employees")]
[Authorize]
public class EmployeesController(IEmployeeService service) : ControllerBase
{
    [HttpGet]
    [RequirePermission(Permission.ViewEmployees)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await service.GetAllAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permission.ViewEmployees)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPost]
    [RequirePermission(Permission.ManageEmployees)]
    public async Task<IActionResult> Create([FromBody] CreateEmployeeRequest request)
    {
        var result = await service.CreateAsync(request);
        return Created($"/api/employees/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permission.ManageEmployees)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateEmployeeRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permission.ManageEmployees)]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        await service.DeactivateAsync(id);
        return NoContent();
    }

    [HttpPatch("{id:guid}/reactivate")]
    [RequirePermission(Permission.ManageEmployees)]
    public async Task<IActionResult> Reactivate(Guid id)
    {
        await service.ReactivateAsync(id);
        return NoContent();
    }
}
