using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.Subscriptions;
using PDV.Application.Interfaces;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/subscriptions")]
[Authorize]
public class SubscriptionsController(ISubscriptionService service) : ControllerBase
{
    // Assinatura efetiva do tenant atual — liberado a qualquer usuário (banner/exibição global).
    [HttpGet("me")]
    public async Task<IActionResult> GetMine() => Ok(await service.GetMineAsync());

    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans() => Ok(await service.GetPlansAsync());

    // Ações de gestão — apenas o Owner, sobre a própria assinatura.
    [HttpPost("checkout")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> Checkout([FromBody] StartCheckoutRequest request) =>
        Ok(await service.StartCheckoutAsync(request));

    // Simula a troca (quanto será cobrado agora, quando o plano novo vale) sem executá-la — alimenta
    // o diálogo de confirmação.
    [HttpPost("change-plan/preview")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> PreviewChangePlan([FromBody] ChangePlanRequest request) =>
        Ok(await service.PreviewChangePlanAsync(request));

    [HttpPost("change-plan")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> ChangePlan([FromBody] ChangePlanRequest request) =>
        Ok(await service.ChangePlanAsync(request));

    [HttpPost("cancel")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> Cancel() => Ok(await service.CancelAsync());
}
