using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PDV.Application.DTOs.Admin;
using PDV.Application.Interfaces;
using PDV.Infrastructure.Services.Payments.AbacatePay;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController(
    IAdminService adminService,
    IOptions<AbacatePayOptions> abacateOptions,
    IAbacatePayApiClient apiClient) : ControllerBase
{
    [HttpGet("webhook-events")]
    public async Task<IActionResult> GetWebhookEvents(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? status = null,
        [FromQuery] string? eventType = null) =>
        Ok(await adminService.GetWebhookEventsAsync(page, pageSize, status, eventType));

    [HttpGet("subscriptions")]
    public async Task<IActionResult> GetSubscriptions() =>
        Ok(await adminService.GetAllSubscriptionsAsync());

    [HttpGet("payments")]
    public async Task<IActionResult> GetPayments() =>
        Ok(await adminService.GetAllPaymentsAsync());

    [HttpGet("config")]
    public IActionResult GetConfig()
    {
        var opts = abacateOptions.Value;
        return Ok(new AdminConfigDto(
            MaskSecret(opts.ApiKey),
            MaskSecret(opts.WebhookSecret),
            opts.BaseUrl,
            opts.BackUrl));
    }

    [HttpPost("test/simulate-pix")]
    public async Task<IActionResult> SimulatePixPayment([FromBody] SimulatePixRequest request)
    {
        var result = await apiClient.SimulatePixPaymentAsync(request.PixChargeId);
        return Ok(result);
    }

    private static string MaskSecret(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length <= 8) return "****";
        return $"{value[..4]}****{value[^4..]}";
    }
}
