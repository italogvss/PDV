using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;

namespace PDV.Api.Controllers;

[Authorize]
[Route("api/notifications")]
[RequireEntitlement(EntitlementCatalog.Notifications)]
public class NotificationsController(INotificationService notificationService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetNotifications()
        => Ok(await notificationService.GetNotificationsAsync());
}
