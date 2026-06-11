using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.Tenants;
using PDV.Application.Interfaces;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/tenants")]
[Authorize]
public class TenantController(ITenantService tenantService) : ControllerBase
{
    private static readonly bool IsProduction =
        string.Equals(
            Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
            "Production",
            StringComparison.OrdinalIgnoreCase);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTenantRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var (response, accessToken) = await tenantService.CreateAsync(userId, request);

        Response.Cookies.Append("access_token", accessToken, new CookieOptions
        {
            HttpOnly = true,
            Secure   = IsProduction,
            SameSite = SameSiteMode.Strict,
            MaxAge   = TimeSpan.FromHours(8),
        });

        return Created($"/api/tenants/{response.TenantId}", response);
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
        => Ok(await tenantService.GetSettingsAsync());

    [HttpPut("settings/business")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> UpdateBusiness([FromBody] BusinessSettingsDto request)
        => Ok(await tenantService.UpdateBusinessAsync(request));

    [HttpPut("settings/operation")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> UpdateOperation([FromBody] OperationSettingsDto request)
        => Ok(await tenantService.UpdateOperationAsync(request));

    [HttpPut("settings/payments")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> UpdatePayments([FromBody] PaymentsSettingsDto request)
        => Ok(await tenantService.UpdatePaymentsAsync(request));
}
