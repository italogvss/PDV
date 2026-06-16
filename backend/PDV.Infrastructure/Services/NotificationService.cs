using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Notifications;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Infrastructure.Persistence;
using System.Security.Claims;
using System.Text.Json;

namespace PDV.Infrastructure.Services;

public class NotificationService(
    AppDbContext context,
    ITenantContext tenantContext,
    IHttpContextAccessor httpContextAccessor) : INotificationService
{
    public async Task<NotificationResponse> GetNotificationsAsync()
    {
        var today = DateTime.UtcNow.Date;
        var userSettings = await GetUserSettingsAsync();

        var stock = userSettings?.NotifyStockAlerts == false
            ? new StockNotifications(0, 0, 0, 0)
            : await GetStockNotificationsAsync();

        var financial = userSettings?.NotifyInvoices == false
            ? new FinancialNotifications(0, 0)
            : await GetFinancialNotificationsAsync(today);

        var appointments = await GetAppointmentNotificationsAsync(today);

        return new NotificationResponse(stock, financial, appointments);
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

    private async Task<StockNotifications> GetStockNotificationsAsync()
    {
        var outOfStock = await context.Products
            .CountAsync(p => p.Stock == 0);

        var criticalStock = await context.Products
            .CountAsync(p => p.MinCriticalStock != null && p.Stock > 0 && p.Stock <= p.MinCriticalStock);

        var lowStock = await context.Products
            .CountAsync(p => p.MinStock != null && p.Stock > 0 && p.Stock <= p.MinStock
                && (p.MinCriticalStock == null || p.Stock > p.MinCriticalStock));

        var negativeStock = await context.Products
            .CountAsync(p => p.Stock < 0);

        return new StockNotifications(outOfStock, criticalStock, lowStock, negativeStock);
    }

    private async Task<FinancialNotifications> GetFinancialNotificationsAsync(DateTime today)
    {
        var overdueExpenses = await context.Expenses
            .CountAsync(e => !e.IsPaid && e.DueDate < today);

        var upcomingExpenses = await context.Expenses
            .CountAsync(e => !e.IsPaid && e.DueDate >= today && e.DueDate < today.AddDays(8));

        return new FinancialNotifications(overdueExpenses, upcomingExpenses);
    }

    private async Task<AppointmentNotifications> GetAppointmentNotificationsAsync(DateTime today)
    {
        if (!await IsModuleEnabledAsync(OperationModule.Appointments))
            return new AppointmentNotifications(0);

        var todayAppointments = await context.Appointments
            .CountAsync(a => a.Start >= today && a.Start < today.AddDays(1));

        return new AppointmentNotifications(todayAppointments);
    }

    private async Task<bool> IsModuleEnabledAsync(OperationModule module)
    {
        // TenantSettings não tem HasQueryFilter — filtrar manualmente
        var settings = await context.TenantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantContext.TenantId);

        if (settings?.EnabledModulesJson is not { Length: > 0 } json)
            return true; // null/vazio = todos os módulos ativos (retrocompatível)

        var modules = JsonSerializer.Deserialize<List<string>>(json) ?? [];
        return modules.Contains(module.ToString(), StringComparer.OrdinalIgnoreCase);
    }
}
