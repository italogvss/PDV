using Microsoft.AspNetCore.Http;
using PDV.Application.DTOs.Announcements;
using PDV.Application.Interfaces;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using System.Security.Claims;

namespace PDV.Infrastructure.Services;

public class AnnouncementService(
    IAnnouncementRepository repository,
    IUserContext userContext,
    IEntitlementService entitlementService,
    IHttpContextAccessor httpContextAccessor) : IAnnouncementService
{
    // Prefixo das Keys de modais fixos (apresentação, etc.) — o feed devolve só essas em SeenKeys.
    private const string LifecyclePrefix = "lifecycle:";

    public async Task<AnnouncementFeedResponse> GetFeedAsync()
    {
        var userId = userContext.UserId;
        var role = CurrentRole();
        var resolved = await entitlementService.ResolveForCurrentTenantAsync();
        var tier = PlanTier.FromPlan(resolved.Plan);

        var seenKeys = await repository.GetSeenKeysAsync(userId);
        var seen = seenKeys.ToHashSet();
        var active = await repository.GetActiveAsync(DateTime.UtcNow);

        var pending = active
            .Where(a => !seen.Contains(a.Id.ToString()))
            .Where(a => Targets(a, tier, role))
            .Select(Map)
            .ToList();

        var lifecycleSeen = seenKeys
            .Where(k => k.StartsWith(LifecyclePrefix, StringComparison.Ordinal))
            .ToList();

        return new AnnouncementFeedResponse(pending, lifecycleSeen);
    }

    public Task MarkSeenAsync(string key) =>
        repository.AddSeenMarkerAsync(userContext.UserId, key);

    // null em qualquer dimensão = vale para todos.
    private static bool Targets(Announcement a, string tier, UserRole? role) =>
        (a.TargetPlanCode is null || string.Equals(a.TargetPlanCode, tier, StringComparison.OrdinalIgnoreCase))
        && (a.TargetRole is null || a.TargetRole == role);

    private UserRole? CurrentRole()
    {
        var claim = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Role);
        return Enum.TryParse<UserRole>(claim, out var role) ? role : null;
    }

    private static AnnouncementResponse Map(Announcement a) => new(
        a.Id,
        a.Title,
        a.Body,
        a.Type.ToString(),
        a.ImageUrl,
        a.CtaLabel,
        a.CtaUrl);
}
