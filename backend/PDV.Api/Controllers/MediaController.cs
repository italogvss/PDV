using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.Media;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;

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
        EnsureCanManageCategory(category);
        var result = await service.GetUploadUrlAsync(category, entityId);
        return Ok(result);
    }

    [HttpPatch("confirm")]
    public async Task<IActionResult> Confirm([FromBody] ConfirmUploadRequest request)
    {
        EnsureCanManageCategory(request.Category);
        await service.ConfirmAsync(request);
        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> Remove(
        [FromQuery] MediaCategory category,
        [FromQuery] Guid entityId)
    {
        EnsureCanManageCategory(category);
        await service.RemoveAsync(category, entityId);
        return NoContent();
    }

    // A imagem do negócio (logo do tenant) é sensível — só Owner/Admin pode subir ou remover.
    // Demais categorias (produto, serviço, avatar) seguem livres para qualquer usuário autenticado.
    private void EnsureCanManageCategory(MediaCategory category)
    {
        if (category == MediaCategory.Tenant && !(User.IsInRole("Owner") || User.IsInRole("Admin")))
            throw new UnauthorizedException("Apenas o proprietário pode alterar a imagem do negócio.");
    }
}
