using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.Announcements;
using PDV.Application.Interfaces;

namespace PDV.Api.Controllers;

[Authorize]
[Route("api/announcements")]
public class AnnouncementsController(IAnnouncementService service) : ControllerBase
{
    // Avisos pendentes + Keys de ciclo de vida já vistas, para o usuário atual.
    [HttpGet("feed")]
    public async Task<IActionResult> GetFeed()
        => Ok(await service.GetFeedAsync());

    // Marca um aviso (ou modal de ciclo de vida) como visto.
    [HttpPost("seen")]
    public async Task<IActionResult> MarkSeen([FromBody] MarkSeenRequest request)
    {
        await service.MarkSeenAsync(request.Key);
        return NoContent();
    }
}
