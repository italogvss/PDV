using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.Media;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/media")]
[Authorize]
public class MediaController(IMediaService service) : ControllerBase
{
    [HttpGet("presigned-url")]
    public async Task<IActionResult> GetPresignedUrl(
        [FromQuery] MediaCategory category,
        [FromQuery] Guid entityId)
    {
        var result = await service.GetUploadUrlAsync(category, entityId);
        return Ok(result);
    }

    [HttpPatch("confirm")]
    public async Task<IActionResult> Confirm([FromBody] ConfirmUploadRequest request)
    {
        await service.ConfirmAsync(request);
        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> Remove(
        [FromQuery] MediaCategory category,
        [FromQuery] Guid entityId)
    {
        await service.RemoveAsync(category, entityId);
        return NoContent();
    }
}
