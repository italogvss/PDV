using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.Tenants;
using PDV.Application.Interfaces;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/tenants")]
[Authorize]
public class TenantController(ITenantService tenantService, IReportService reportService) : ControllerBase
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
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> UpdateBusiness([FromBody] BusinessSettingsDto request)
        => Ok(await tenantService.UpdateBusinessAsync(request));

    [HttpPut("settings/operation")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> UpdateOperation([FromBody] OperationSettingsDto request)
        => Ok(await tenantService.UpdateOperationAsync(request));

    [HttpPut("settings/payments")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> UpdatePayments([FromBody] PaymentsSettingsDto request)
        => Ok(await tenantService.UpdatePaymentsAsync(request));

    [HttpPut("settings/modules")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> UpdateModules([FromBody] ModulesSettingsDto request)
        => Ok(await tenantService.UpdateModulesAsync(request));

    [HttpDelete("current")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Deactivate()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var accessToken = await tenantService.DeactivateCurrentAsync(userId);

        Response.Cookies.Append("access_token", accessToken, new CookieOptions
        {
            HttpOnly = true,
            Secure   = IsProduction,
            SameSite = SameSiteMode.Strict,
            MaxAge   = TimeSpan.FromHours(8),
        });

        return NoContent();
    }

    // Exporta dados de um tenant inativo (agendado para exclusão) pelo Owner.
    // Não usa o contexto de tenant do JWT — o tenantId vem explicitamente na rota.
    [HttpGet("{tenantId:guid}/export/{category}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> ExportInactiveTenantData(Guid tenantId, string category)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await tenantService.ValidateOwnershipAsync(userId, tenantId);

        var filenames = new Dictionary<string, string>
        {
            ["sales"]     = "vendas.csv",
            ["products"]  = "produtos.csv",
            ["customers"] = "clientes.csv",
            ["services"]  = "servicos.csv",
            ["expenses"]  = "despesas.csv",
            ["billing"]   = "faturamento.csv",
            ["team"]      = "equipe.csv",
        };

        var csv = await reportService.ExportForTenantAsync(tenantId, category);
        var filename = filenames.GetValueOrDefault(category, $"{category}.csv");
        return File(csv, "text/csv", filename);
    }
}
