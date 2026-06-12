using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.DTOs.Appointments;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/appointments")]
[Authorize]
public class AppointmentsController(IAppointmentService service) : ControllerBase
{
    [HttpGet]
    [RequirePermission(Permission.ViewAppointments)]
    public async Task<IActionResult> GetByDateRange(
        [FromQuery] DateOnly startDate,
        [FromQuery] DateOnly endDate)
    {
        var result = await service.GetByDateRangeAsync(startDate, endDate);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permission.ViewAppointments)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPost]
    [RequirePermission(Permission.ManageAppointments)]
    public async Task<IActionResult> Create([FromBody] CreateAppointmentRequest request)
    {
        var result = await service.CreateAsync(request);
        return Created($"/api/appointments/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permission.ManageAppointments)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAppointmentRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    [RequirePermission(Permission.ManageAppointments)]
    public async Task<IActionResult> ChangeStatus(Guid id, [FromBody] ChangeAppointmentStatusRequest request)
    {
        var result = await service.ChangeStatusAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(Permission.ManageAppointments)]
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
}
