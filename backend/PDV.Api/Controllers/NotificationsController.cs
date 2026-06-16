using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.Interfaces;

namespace PDV.Api.Controllers;

[Authorize]
[Route("api/notifications")]
public class NotificationsController(INotificationService notificationService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetNotifications()
        => Ok(await notificationService.GetNotificationsAsync());
}
