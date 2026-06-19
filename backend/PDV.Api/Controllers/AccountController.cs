using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.Users;
using PDV.Application.Interfaces;

namespace PDV.Api.Controllers;

// Configurações pessoais do usuário logado (UserSettings). Self-service:
// qualquer usuário autenticado edita as próprias preferências — não exige Owner.
[ApiController]
[Route("api/account")]
[Authorize]
public class AccountController(IUserSettingsService settingsService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
        => Ok(await settingsService.GetAsync(UserId));

    [HttpPut("settings/appearance")]
    public async Task<IActionResult> UpdateAppearance([FromBody] AppearanceSettingsDto request)
        => Ok(await settingsService.UpdateAppearanceAsync(UserId, request));

    [HttpPut("settings/notifications")]
    public async Task<IActionResult> UpdateNotifications([FromBody] NotificationSettingsDto request)
        => Ok(await settingsService.UpdateNotificationsAsync(UserId, request));
}
