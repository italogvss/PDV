using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Api.Attributes;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;

namespace PDV.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
[RequireEntitlement(EntitlementCatalog.Notifications)]
public class NotificationsController(INotificationService notificationService) : ControllerBase
{
    // Sem [RequirePermission] na classe de propósito: cada regra do motor declara a sua
    // permissão e o service filtra item a item, para que um funcionário veja só o que
    // o cargo dele alcança em vez de receber 401 no painel inteiro.
    [HttpGet]
    public async Task<IActionResult> GetNotifications()
        => Ok(await notificationService.GetNotificationsAsync());
}
