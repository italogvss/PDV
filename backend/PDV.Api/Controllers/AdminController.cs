using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using PDV.Application.DTOs.Admin;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;
using PDV.Infrastructure.Services.Payments.Stripe;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController(
    IAdminService adminService,
    IOptions<StripeOptions> stripeOptions) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview() =>
        Ok(await adminService.GetOverviewAsync());

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
        var opts = stripeOptions.Value;
        return Ok(new AdminConfigDto(
            MaskSecret(opts.ApiKey),
            MaskSecret(opts.WebhookSecret),
            Provider: StripeGateway.ProviderName,
            ConfiguredPriceCount: opts.Prices.Count(p => !string.IsNullOrWhiteSpace(p.Value))));
    }

    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans() =>
        Ok(await adminService.GetAllPlansAsync());

    [HttpGet("plans/{id:guid}")]
    public async Task<IActionResult> GetPlan(Guid id) =>
        Ok(await adminService.GetPlanByIdAsync(id));

    [HttpPut("plans/{id:guid}")]
    public async Task<IActionResult> UpdatePlan(Guid id, [FromBody] UpdatePlanRequest request) =>
        Ok(await adminService.UpdatePlanAsync(id, request));

    [HttpDelete("plans/{id:guid}")]
    public async Task<IActionResult> DeactivatePlan(Guid id)
    {
        await adminService.DeactivatePlanAsync(id);
        return NoContent();
    }

    // ── Cupons ───────────────────────────────────────────────────────────────────────────────

    [HttpGet("coupons")]
    public async Task<IActionResult> GetCoupons() =>
        Ok(await adminService.GetCouponsAsync());

    [HttpPost("coupons")]
    public async Task<IActionResult> CreateCoupon([FromBody] AdminCreateCouponRequest request) =>
        Ok(await adminService.CreateCouponAsync(request));

    // O id é o Promotion Code do Stripe (`promo_...`), não um Guid.
    [HttpDelete("coupons/{id}")]
    public async Task<IActionResult> DeactivateCoupon(string id)
    {
        await adminService.DeactivateCouponAsync(id);
        return NoContent();
    }

    // ── Fase 3: Suporte & Conteúdo ──────────────────────────────────────────────────────────

    [HttpGet("contact-messages")]
    public async Task<IActionResult> GetContactMessages() =>
        Ok(await adminService.GetContactMessagesAsync());

    [HttpPatch("contact-messages/{id:guid}/status")]
    public async Task<IActionResult> UpdateContactStatus(Guid id, [FromBody] UpdateContactStatusRequest request) =>
        Ok(await adminService.UpdateContactStatusAsync(id, request));

    [HttpGet("announcements")]
    public async Task<IActionResult> GetAnnouncements() =>
        Ok(await adminService.GetAnnouncementsAsync());

    [HttpPost("announcements")]
    public async Task<IActionResult> CreateAnnouncement([FromBody] AnnouncementRequest request) =>
        Ok(await adminService.CreateAnnouncementAsync(request));

    [HttpPut("announcements/{id:guid}")]
    public async Task<IActionResult> UpdateAnnouncement(Guid id, [FromBody] AnnouncementRequest request) =>
        Ok(await adminService.UpdateAnnouncementAsync(id, request));

    [HttpDelete("announcements/{id:guid}")]
    public async Task<IActionResult> DeactivateAnnouncement(Guid id)
    {
        await adminService.DeactivateAnnouncementAsync(id);
        return NoContent();
    }

    // ── Conteúdo Legal ──────────────────────────────────────────────────────────────────────

    [HttpGet("legal-documents")]
    public async Task<IActionResult> GetLegalDocuments() =>
        Ok(await adminService.GetLegalDocumentsAsync());

    [HttpPut("legal-documents/{type}")]
    public async Task<IActionResult> UpdateLegalDocument(LegalDocumentType type, [FromBody] UpdateLegalDocumentRequest request) =>
        Ok(await adminService.UpdateLegalDocumentAsync(type, request));

    // ── Fase 4: Observabilidade ─────────────────────────────────────────────────────────────

    [HttpGet("system-logs")]
    public async Task<IActionResult> GetSystemLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? level = null) =>
        Ok(await adminService.GetSystemLogsAsync(page, pageSize, level));

    [HttpGet("platform-events")]
    public async Task<IActionResult> GetPlatformEvents(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? source = null) =>
        Ok(await adminService.GetPlatformEventsAsync(page, pageSize, source));

    // ── Conformidade / LGPD ─────────────────────────────────────────────────────────────────

    [HttpGet("account-deletions")]
    public async Task<IActionResult> GetAccountDeletions() =>
        Ok(await adminService.GetAccountDeletionsAsync());

    [HttpGet("retention-tenants")]
    public async Task<IActionResult> GetRetentionTenants() =>
        Ok(await adminService.GetRetentionTenantsAsync());

    [HttpGet("access-logs")]
    public async Task<IActionResult> GetAccessLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50) =>
        Ok(await adminService.GetAccessLogsAsync(page, pageSize));

    // Saúde da API para o painel. Roda os mesmos checks do /health, mas detalhado e só para o admin.
    [HttpGet("health")]
    public async Task<IActionResult> GetHealth([FromServices] HealthCheckService healthCheckService)
    {
        var report = await healthCheckService.CheckHealthAsync();
        return Ok(new AdminHealthDto(
            report.Status.ToString(),
            report.TotalDuration.TotalMilliseconds,
            report.Entries
                .Select(e => new AdminHealthEntryDto(
                    e.Key,
                    e.Value.Status.ToString(),
                    e.Value.Description,
                    e.Value.Duration.TotalMilliseconds))
                .ToList()));
    }

    private static string MaskSecret(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length <= 8) return "****";
        return $"{value[..4]}****{value[^4..]}";
    }
}
