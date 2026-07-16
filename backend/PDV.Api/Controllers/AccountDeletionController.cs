using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.Account;
using PDV.Application.Interfaces;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/account/deletion")]
[Authorize]
public class AccountDeletionController(IAccountDeletionService service) : ControllerBase
{
    // Estado corrente — liberado a qualquer usuário autenticado (o frontend usa para o banner/tela de
    // "conta em exclusão"). Precisa continuar acessível durante o bloqueio (allowlist do middleware).
    [HttpGet]
    public async Task<IActionResult> GetStatus() => Ok(await service.GetStatusAsync());

    // Ações do Owner sobre a própria conta.
    [HttpGet("preview")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Preview() => Ok(await service.PreviewAsync());

    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Request([FromBody] RequestAccountDeletionRequest request) =>
        Ok(await service.RequestAsync(request));

    // Reativar (reverter) durante a carência.
    [HttpPost("cancel")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Cancel()
    {
        await service.CancelAsync();
        return NoContent();
    }
}
