using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Admin;
using PDV.Application.DTOs.Common;
using PDV.Application.Interfaces;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

// Serviço admin — SEM tenant context. Acessa entidades globais (cobrança, webhooks, usuários)
// sem filtro de tenant. Usado exclusivamente pelo AdminController (role Admin).
public class AdminService(AppDbContext context) : IAdminService
{
    public async Task<PaginatedResponse<AdminWebhookEventDto>> GetWebhookEventsAsync(
        int page, int pageSize, string? status, string? eventType)
    {
        var query = context.WebhookEvents.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(e => e.Status == status);

        if (!string.IsNullOrWhiteSpace(eventType))
            query = query.Where(e => e.EventType == eventType);

        var totalCount = await query.CountAsync();

        var data = await query
            .OrderByDescending(e => e.ReceivedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new AdminWebhookEventDto(
                e.Id,
                e.Provider,
                e.EventId,
                e.EventType,
                e.Status,
                e.ReceivedAt,
                e.ProcessedAt,
                e.Error))
            .ToListAsync();

        return new PaginatedResponse<AdminWebhookEventDto>(
            data, page, pageSize, totalCount,
            (int)Math.Ceiling((double)totalCount / pageSize));
    }

    public async Task<List<AdminSubscriptionDto>> GetAllSubscriptionsAsync() =>
        await (
            from s in context.Subscriptions
            join p in context.Plans on s.PlanId equals p.Id
            join u in context.Users on s.UserId equals u.Id
            orderby s.CreatedAt descending
            select new AdminSubscriptionDto(
                s.Id,
                u.Email,
                u.Name,
                p.Name,
                s.Status.ToString(),
                s.Method.ToString(),
                s.Provider,
                s.IsRenewable,
                s.GatewaySubscriptionId,
                s.GatewayCustomerId,
                s.TrialEndsAt,
                s.CurrentPeriodEnd,
                s.CanceledAt,
                s.CreatedAt)
        ).ToListAsync();

    public async Task<List<AdminPaymentDto>> GetAllPaymentsAsync() =>
        await (
            from p in context.Payments
            join u in context.Users on p.UserId equals u.Id
            orderby p.CreatedAt descending
            select new AdminPaymentDto(
                p.Id,
                u.Email,
                u.Name,
                p.GatewayChargeId,
                p.Kind.ToString(),
                p.Method.ToString(),
                p.AmountCents,
                p.Status.ToString(),
                p.Provider,
                p.CouponCode,
                p.PaidAt,
                p.PeriodStart,
                p.PeriodEnd,
                p.ReceiptUrl,
                p.CreatedAt)
        ).ToListAsync();

    public async Task<List<AdminPlanDto>> GetAllPlansAsync() =>
        await context.Plans
            .OrderBy(p => p.DisplayOrder)
            .Select(p => MapPlan(p))
            .ToListAsync();

    public async Task<AdminPlanDto> GetPlanByIdAsync(Guid id)
    {
        var plan = await context.Plans.FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new NotFoundException("Plano não encontrado.");
        return MapPlan(plan);
    }

    public async Task<AdminPlanDto> UpdatePlanAsync(Guid id, UpdatePlanRequest request)
    {
        var plan = await context.Plans.FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new NotFoundException("Plano não encontrado.");

        plan.Name = request.Name;
        plan.Description = request.Description;
        plan.PriceCents = request.PriceCents;
        plan.TrialDays = request.TrialDays;
        plan.SupportsCard = request.SupportsCard;
        plan.SupportsPix = request.SupportsPix;
        plan.DisplayOrder = request.DisplayOrder;
        plan.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();
        return MapPlan(plan);
    }

    public async Task DeactivatePlanAsync(Guid id)
    {
        var plan = await context.Plans.FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new NotFoundException("Plano não encontrado.");

        plan.IsActive = false;
        plan.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
    }

    private static AdminPlanDto MapPlan(PDV.Domain.Entities.Plan p)
    {
        var modules = string.IsNullOrWhiteSpace(p.ModulesJson)
            ? []
            : JsonSerializer.Deserialize<List<string>>(p.ModulesJson) ?? [];

        var limits = string.IsNullOrWhiteSpace(p.LimitsJson)
            ? new Dictionary<string, int>()
            : JsonSerializer.Deserialize<Dictionary<string, int>>(p.LimitsJson) ?? [];

        return new AdminPlanDto(
            p.Id,
            p.Name,
            p.Description,
            p.PriceCents,
            p.BillingPeriod.ToString(),
            p.TrialDays,
            p.SupportsCard,
            p.SupportsPix,
            p.IsActive,
            p.DisplayOrder,
            p.ExternalProductId,
            modules,
            limits,
            p.CreatedAt,
            p.UpdatedAt);
    }
}
