using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.Expenses;
using PDV.Application.Interfaces;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/expenses")]
[Authorize(Roles = "Admin")]
public class ExpensesController(IExpenseService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? month = null,
        [FromQuery] int? year = null,
        [FromQuery] bool? isPaid = null)
    {
        var result = await service.GetAllAsync(page, pageSize, month, year, isPaid);
        return Ok(result);
    }

    [HttpGet("chart")]
    public async Task<IActionResult> GetChart(
        [FromQuery] string startDate,
        [FromQuery] string endDate,
        [FromQuery] string groupBy = "month")
    {
        var start = DateTime.Parse(startDate);
        var end   = DateTime.Parse(endDate);
        var result = await service.GetChartAsync(start, end, groupBy);
        return Ok(result);
    }

    [HttpGet("recurring")]
    public async Task<IActionResult> GetRecurring()
    {
        var result = await service.GetRecurringUnpaidAsync();
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateExpenseRequest request)
    {
        var result = await service.CreateAsync(request);
        return Created($"/api/expenses/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateExpenseRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/pay")]
    public async Task<IActionResult> MarkAsPaid(Guid id)
    {
        var result = await service.MarkAsPaidAsync(id);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await service.DeleteAsync(id);
        return NoContent();
    }
}
