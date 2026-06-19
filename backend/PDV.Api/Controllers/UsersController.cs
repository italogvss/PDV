using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.Users;
using PDV.Application.Interfaces;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Owner,Admin")]
public class UsersController(IUserService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        var result = await service.GetAllAsync(page, pageSize, search);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return Ok(result);
    }
}
