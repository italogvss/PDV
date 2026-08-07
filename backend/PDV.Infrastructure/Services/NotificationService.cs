using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Notifications;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Persistence;
using PDV.Infrastructure.Services.Notifications;
using System.Security.Claims;

namespace PDV.Infrastructure.Services;

// Motor de notificações. Não conhece nenhuma notificação em particular: percorre
// NotificationRules.All aplicando o mesmo gating a todas (módulo do tenant × permissão do
// usuário × preferência pessoal) e executa a contagem das que sobraram.
public class NotificationService(
    AppDbContext context,
    ITenantContext tenantContext,
    IPermissionService permissionService,
    IHttpContextAccessor httpContextAccessor) : INotificationService
{
    public async Task<NotificationsResponse> GetNotificationsAsync()
    {
        // Usuário sem linha de UserSettings (conta antiga) usa os defaults da entidade,
        // que são todos "notificar".
        var userSettings = await GetUserSettingsAsync() ?? new UserSettings();
        var tenantSettings = await GetTenantSettingsAsync();
        var enabledModules = OperationModuleHelper.ReadEnabled(tenantSettings?.EnabledModulesJson);

        var ctx = new NotificationContext(context, BusinessClock.Today, tenantSettings);
        var items = new List<NotificationItemResponse>();

        foreach (var rule in NotificationRules.All)
        {
            if (!enabledModules.Contains(rule.Module.ToString(), StringComparer.OrdinalIgnoreCase))
                continue;

            if (!rule.IsPreferenceEnabled(userSettings))
                continue;

            if (!await HasPermissionAsync(rule.Permissions))
                continue;

            var count = await rule.CountAsync(ctx);
            if (count > 0)
                items.Add(new NotificationItemResponse(rule.Key, count));
        }

        return new NotificationsResponse(items);
    }

    // Este endpoint roda em loop (poll de 60s). Um 401 aqui derrubaria a sessão inteira no
    // interceptor do frontend, então falha de permissão vira "não mostra a linha".
    private async Task<bool> HasPermissionAsync(Permission[] permissions)
    {
        try
        {
            return await permissionService.HasAnyAsync(permissions);
        }
        catch (UnauthorizedException)
        {
            return false;
        }
    }

    private async Task<UserSettings?> GetUserSettingsAsync()
    {
        var userIdClaim = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return null;

        // UserSettings não tem HasQueryFilter — filtrar manualmente por UserId
        return await context.UserSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId);
    }

    // TenantSettings não tem HasQueryFilter — filtrar manualmente. Carregado uma única vez por
    // request e repassado às regras (antes era um SELECT novo para cada módulo checado).
    private Task<TenantSettings?> GetTenantSettingsAsync() =>
        context.TenantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantContext.TenantId);
}
