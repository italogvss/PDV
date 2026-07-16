using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Admin;
using PDV.Application.DTOs.Common;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

// Serviço admin — SEM tenant context. Acessa entidades globais (cobrança, webhooks, usuários)
// sem filtro de tenant. Usado exclusivamente pelo AdminController (role Admin).
public class AdminService(AppDbContext context) : IAdminService
{
    private const int RevenueMonths = 6;

    // Teto de eventos lidos de CADA fonte da timeline da plataforma (ver GetPlatformEventsAsync).
    private const int TimelineWindowPerSource = 300;

    public async Task<AdminOverviewDto> GetOverviewAsync()
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var seriesStart = monthStart.AddMonths(-(RevenueMonths - 1));

        // Assinaturas com o plano (ambas entidades são globais/sem filtro de tenant). Conjunto pequeno;
        // MRR e a distribuição por plano são computados em memória para reusar Subscription.IsEntitledAt.
        var subs = await context.Subscriptions
            .Include(s => s.Plan)
            .AsNoTracking()
            .ToListAsync();

        static int Normalize(Plan p) => p.BillingPeriod == BillingPeriod.Annual ? p.PriceCents / 12 : p.PriceCents;

        var mrr = subs.Where(s => s.Status == SubscriptionStatus.Active).Sum(s => Normalize(s.Plan));

        int CountStatus(SubscriptionStatus status) => subs.Count(s => s.Status == status);

        var planDistribution = subs
            .Where(s => s.Status == SubscriptionStatus.Active)
            .GroupBy(s => s.Plan.Name)
            .Select(g => new AdminPlanDistributionDto(g.Key, g.Count()))
            .OrderByDescending(x => x.ActiveCount)
            .ToList();

        // Pagamentos pagos nos últimos meses (conjunto limitado) para receita do mês e a série.
        var paidRecent = await context.Payments
            .Where(p => p.Status == PaymentStatus.Paid && p.PaidAt != null && p.PaidAt >= seriesStart)
            .Select(p => new { p.AmountCents, PaidAt = p.PaidAt!.Value })
            .ToListAsync();

        var revenueByMonth = Enumerable.Range(0, RevenueMonths)
            .Select(offset =>
            {
                var month = seriesStart.AddMonths(offset);
                var cents = paidRecent
                    .Where(p => p.PaidAt.Year == month.Year && p.PaidAt.Month == month.Month)
                    .Sum(p => p.AmountCents);
                return new AdminRevenuePointDto(month.ToString("yyyy-MM"), cents);
            })
            .ToList();

        var monthRevenue = paidRecent.Where(p => p.PaidAt >= monthStart).Sum(p => p.AmountCents);
        var monthRefunded = await context.Payments
            .Where(p => p.Status == PaymentStatus.Refunded && p.UpdatedAt >= monthStart)
            .SumAsync(p => (int?)p.AmountCents) ?? 0;
        var failedPayments = await context.Payments.CountAsync(p => p.Status == PaymentStatus.Failed);

        var totalTenants = await context.Tenants.CountAsync(t => t.IsActive);
        var totalUsers = await context.Users.CountAsync();
        var accountsInDeletion = await context.Users.CountAsync(u => u.AccountDeletionRequestedAt != null);

        var webhookFailures24h = await context.WebhookEvents
            .CountAsync(e => e.Status == "Failed" && e.ReceivedAt >= now.AddHours(-24));
        var activePlansMissingGateway = await context.Plans
            .CountAsync(p => p.IsActive && (p.ExternalProductId == null || p.ExternalProductId == ""));

        return new AdminOverviewDto(
            MrrCents: mrr,
            ArrCents: mrr * 12,
            ActiveSubscriptions: CountStatus(SubscriptionStatus.Active),
            TrialingSubscriptions: CountStatus(SubscriptionStatus.Trialing),
            CanceledSubscriptions: CountStatus(SubscriptionStatus.Canceled),
            ExpiredSubscriptions: CountStatus(SubscriptionStatus.Expired),
            PastDueSubscriptions: subs.Count(s => s.Status == SubscriptionStatus.Active && !s.IsEntitledAt(now)),
            MonthRevenueCents: monthRevenue,
            MonthRefundedCents: monthRefunded,
            FailedPaymentsCount: failedPayments,
            TotalTenants: totalTenants,
            TotalUsers: totalUsers,
            AccountsInDeletion: accountsInDeletion,
            WebhookFailures24h: webhookFailures24h,
            ActivePlansMissingGateway: activePlansMissingGateway,
            PlanDistribution: planDistribution,
            RevenueByMonth: revenueByMonth);
    }

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
            .OrderBy(p => p.PriceCents)
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

    // ── Fase 3: Suporte & Conteúdo ────────────────────────────────────────────────────────────

    public async Task<List<AdminContactMessageDto>> GetContactMessagesAsync()
    {
        // ContactMessage é tenant-scoped → IgnoreQueryFilters() para o admin ler de todas as lojas.
        var rows = await (
            from c in context.ContactMessages.IgnoreQueryFilters()
            join u in context.Users on c.UserId equals u.Id into gj
            from u in gj.DefaultIfEmpty()
            orderby c.CreatedAt descending
            select new { c, u }
        ).ToListAsync();

        return rows.Select(r => MapContact(r.c, r.u)).ToList();
    }

    public async Task<AdminContactMessageDto> UpdateContactStatusAsync(Guid id, UpdateContactStatusRequest request)
    {
        var status = ParseContactStatus(request.Status);
        // Cross-tenant: a mensagem pode ser de qualquer loja.
        var msg = await context.ContactMessages.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new NotFoundException("Mensagem não encontrada.");

        msg.Status = status;
        msg.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == msg.UserId);
        return MapContact(msg, user);
    }

    public async Task<List<AdminAnnouncementDto>> GetAnnouncementsAsync()
    {
        var list = await context.Announcements
            .OrderByDescending(a => a.Priority)
            .ThenByDescending(a => a.CreatedAt)
            .ToListAsync();
        return list.Select(MapAnnouncement).ToList();
    }

    public async Task<AdminAnnouncementDto> CreateAnnouncementAsync(AnnouncementRequest request)
    {
        ValidateAnnouncement(request);
        var a = new Announcement
        {
            Title = request.Title.Trim(),
            Body = request.Body,
            Type = ParseType(request.Type),
            ImageUrl = request.ImageUrl,
            CtaLabel = request.CtaLabel,
            CtaUrl = request.CtaUrl,
            PublishAt = request.PublishAt,
            ExpiresAt = request.ExpiresAt,
            TargetPlanCode = request.TargetPlanCode,
            TargetRole = ParseTargetRole(request.TargetRole),
            Priority = request.Priority,
        };
        context.Announcements.Add(a);
        await context.SaveChangesAsync();
        return MapAnnouncement(a);
    }

    public async Task<AdminAnnouncementDto> UpdateAnnouncementAsync(Guid id, AnnouncementRequest request)
    {
        ValidateAnnouncement(request);
        var a = await context.Announcements.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new NotFoundException("Anúncio não encontrado.");

        a.Title = request.Title.Trim();
        a.Body = request.Body;
        a.Type = ParseType(request.Type);
        a.ImageUrl = request.ImageUrl;
        a.CtaLabel = request.CtaLabel;
        a.CtaUrl = request.CtaUrl;
        a.PublishAt = request.PublishAt;
        a.ExpiresAt = request.ExpiresAt;
        a.TargetPlanCode = request.TargetPlanCode;
        a.TargetRole = ParseTargetRole(request.TargetRole);
        a.Priority = request.Priority;
        a.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return MapAnnouncement(a);
    }

    public async Task DeactivateAnnouncementAsync(Guid id)
    {
        var a = await context.Announcements.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new NotFoundException("Anúncio não encontrado.");
        a.IsActive = false;
        a.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
    }

    // ── Fase 4: Observabilidade ───────────────────────────────────────────────────────────────

    public async Task<PaginatedResponse<AdminSystemLogDto>> GetSystemLogsAsync(int page, int pageSize, string? level)
    {
        var query = context.SystemLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(level))
            query = query.Where(l => l.Level == level);

        var totalCount = await query.CountAsync();

        var data = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new AdminSystemLogDto(
                l.Id, l.Level, l.Message, l.Exception, l.SourceContext, l.RequestPath, l.CreatedAt))
            .ToListAsync();

        return new PaginatedResponse<AdminSystemLogDto>(
            data, page, pageSize, totalCount,
            (int)Math.Ceiling((double)totalCount / pageSize));
    }

    // Timeline da plataforma: funde três feeds já existentes (acessos, webhooks e auditoria de
    // negócio). É uma janela dos eventos RECENTES — pega no máximo TimelineWindowPerSource de cada
    // fonte e ordena em memória. Não é um paginador histórico completo: fundir três tabelas com
    // paginação real exigiria UNION no banco, e o valor aqui é "o que está acontecendo agora".
    public async Task<PaginatedResponse<AdminPlatformEventDto>> GetPlatformEventsAsync(int page, int pageSize, string? source)
    {
        var events = new List<AdminPlatformEventDto>();

        if (source is null or "" or "Access")
        {
            var rows = await (
                from a in context.AccessLogs
                join u in context.Users on a.UserId equals u.Id into gj
                from u in gj.DefaultIfEmpty()
                orderby a.CreatedAt descending
                select new { a.Id, a.Event, a.IpAddress, a.CreatedAt, Email = u != null ? u.Email : null }
            ).Take(TimelineWindowPerSource).ToListAsync();

            events.AddRange(rows.Select(r => new AdminPlatformEventDto(
                r.Id, "Access", r.Event.ToString(), r.Email ?? "—", r.IpAddress, r.CreatedAt)));
        }

        if (source is null or "" or "Webhook")
        {
            var rows = await context.WebhookEvents
                .OrderByDescending(w => w.ReceivedAt)
                .Take(TimelineWindowPerSource)
                .Select(w => new { w.Id, w.EventType, w.Status, w.Provider, w.Error, w.ReceivedAt })
                .ToListAsync();

            events.AddRange(rows.Select(r => new AdminPlatformEventDto(
                r.Id, "Webhook", r.EventType, r.Provider, r.Error ?? r.Status, r.ReceivedAt)));
        }

        if (source is null or "" or "Audit")
        {
            // AuditLog é tenant-scoped → IgnoreQueryFilters() para o admin ver todas as lojas.
            var rows = await context.AuditLogs.IgnoreQueryFilters()
                .OrderByDescending(l => l.CreatedAt)
                .Take(TimelineWindowPerSource)
                .Select(l => new { l.Id, l.Action, l.EntityType, l.EntityName, l.PerformedByName, l.CreatedAt })
                .ToListAsync();

            events.AddRange(rows.Select(r => new AdminPlatformEventDto(
                r.Id, "Audit", r.Action.ToString(), r.PerformedByName,
                $"{r.EntityType}: {r.EntityName}", r.CreatedAt)));
        }

        var ordered = events.OrderByDescending(e => e.OccurredAt).ToList();
        var totalCount = ordered.Count;
        var data = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return new PaginatedResponse<AdminPlatformEventDto>(
            data, page, pageSize, totalCount,
            (int)Math.Ceiling((double)totalCount / pageSize));
    }

    // ── Conformidade / LGPD ───────────────────────────────────────────────────────────────────
    //
    // Nenhuma query aqui precisa de IgnoreQueryFilters(): AccountDeletion, AccessLog, Tenant,
    // TenantSettings e User são entidades sem query filter de tenant (ver OnModelCreating).

    public async Task<List<AdminAccountDeletionDto>> GetAccountDeletionsAsync()
    {
        var rows = await (
            from d in context.AccountDeletions
            join u in context.Users on d.UserId equals u.Id into gj
            from u in gj.DefaultIfEmpty()
            orderby d.RequestedAt descending
            select new { d, Email = u != null ? u.Email : null }
        ).ToListAsync();

        return rows.Select(r => new AdminAccountDeletionDto(
            r.d.Id,
            r.d.UserId,
            r.Email ?? "—",
            r.d.Scope.ToString(),
            r.d.TenantId,
            r.d.Path.ToString(),
            r.d.Status.ToString(),
            r.d.RequestedAt,
            r.d.CarencyStartsAt,
            r.d.ScheduledDeletionAt,
            r.d.EffectedAt,
            r.d.PurgeAfter,
            r.d.SubscriptionCanceled,
            r.d.RefundRequested)).ToList();
    }

    public async Task<List<AdminRetentionTenantDto>> GetRetentionTenantsAsync()
    {
        // Só as lojas que estão no pipeline: agendadas para exclusão ou retidas por legal-hold.
        var tenants = await context.Tenants
            .Where(t => t.ScheduledDeletionAt != null || t.LegalHoldUntil != null)
            .AsNoTracking()
            .ToListAsync();

        if (tenants.Count == 0) return [];

        var tenantIds = tenants.Select(t => t.Id).ToList();

        var names = await context.TenantSettings
            .Where(s => tenantIds.Contains(s.TenantId))
            .Select(s => new { s.TenantId, s.FantasyName })
            .ToDictionaryAsync(x => x.TenantId, x => x.FantasyName);

        var owners = await context.UserTenants
            .Where(ut => tenantIds.Contains(ut.TenantId) && ut.Role == UserRole.Owner)
            .Join(context.Users, ut => ut.UserId, u => u.Id, (ut, u) => new { ut.TenantId, u.Email })
            .ToListAsync();
        var ownerByTenant = owners
            .GroupBy(o => o.TenantId)
            .ToDictionary(g => g.Key, g => g.First().Email);

        return tenants
            .Select(t => new AdminRetentionTenantDto(
                t.Id,
                names.GetValueOrDefault(t.Id) ?? "—",
                ownerByTenant.GetValueOrDefault(t.Id) ?? "—",
                t.IsActive,
                t.ScheduledDeletionAt,
                t.LegalHoldUntil,
                t.CreatedAt))
            .OrderBy(t => t.ScheduledDeletionAt ?? t.LegalHoldUntil)
            .ToList();
    }

    public async Task<PaginatedResponse<AdminAccessLogDto>> GetAccessLogsAsync(int page, int pageSize)
    {
        var totalCount = await context.AccessLogs.CountAsync();

        var rows = await (
            from a in context.AccessLogs
            join u in context.Users on a.UserId equals u.Id into gj
            from u in gj.DefaultIfEmpty()
            orderby a.CreatedAt descending
            select new { a, Email = u != null ? u.Email : null }
        ).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var data = rows.Select(r => new AdminAccessLogDto(
            r.a.Id,
            r.a.UserId,
            r.Email ?? "—",
            r.a.Event.ToString(),
            r.a.IpAddress,
            r.a.UserAgent,
            r.a.CreatedAt)).ToList();

        return new PaginatedResponse<AdminAccessLogDto>(
            data, page, pageSize, totalCount,
            (int)Math.Ceiling((double)totalCount / pageSize));
    }

    private static AdminContactMessageDto MapContact(ContactMessage c, User? u) =>
        new(
            c.Id,
            c.TenantId,
            c.UserId,
            u?.Name ?? "—",
            u?.Email ?? "—",
            c.Category.ToString(),
            c.Subject,
            c.Body,
            c.Status.ToString(),
            c.ExpectedBehavior,
            c.Reproducibility?.ToString(),
            c.PageContext,
            c.AppVersion,
            c.Browser,
            c.ScreenResolution,
            c.Platform,
            c.CreatedAt);

    private static AdminAnnouncementDto MapAnnouncement(Announcement a) =>
        new(
            a.Id,
            a.Title,
            a.Body,
            a.Type.ToString(),
            a.ImageUrl,
            a.CtaLabel,
            a.CtaUrl,
            a.PublishAt,
            a.ExpiresAt,
            a.TargetPlanCode,
            a.TargetRole?.ToString(),
            a.Priority,
            a.IsActive,
            a.CreatedAt,
            a.UpdatedAt);

    private static void ValidateAnnouncement(AnnouncementRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Title)) throw new BusinessException("Informe o título.");
        if (string.IsNullOrWhiteSpace(r.Body)) throw new BusinessException("Informe o conteúdo.");
        if (r.PublishAt.HasValue && r.ExpiresAt.HasValue && r.ExpiresAt < r.PublishAt)
            throw new BusinessException("A expiração deve ser depois da publicação.");
    }

    private static AnnouncementType ParseType(string value) =>
        Enum.TryParse<AnnouncementType>(value, ignoreCase: true, out var t)
            ? t
            : throw new BusinessException("Tipo de anúncio inválido.");

    private static UserRole? ParseTargetRole(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? null
            : Enum.TryParse<UserRole>(value, ignoreCase: true, out var r)
                ? r
                : throw new BusinessException("Papel-alvo inválido.");

    private static ContactMessageStatus ParseContactStatus(string value) =>
        Enum.TryParse<ContactMessageStatus>(value, ignoreCase: true, out var s)
            ? s
            : throw new BusinessException("Status inválido.");

    private static AdminPlanDto MapPlan(PDV.Domain.Entities.Plan p)
    {
        var modules = string.IsNullOrWhiteSpace(p.EntitledModulesJson)
            ? []
            : JsonSerializer.Deserialize<List<string>>(p.EntitledModulesJson) ?? [];

        var limits = string.IsNullOrWhiteSpace(p.LimitsJson)
            ? new Dictionary<string, int>()
            : JsonSerializer.Deserialize<Dictionary<string, int>>(p.LimitsJson) ?? [];

        return new AdminPlanDto(
            p.Id,
            p.Name,
            p.Description,
            p.PriceCents,
            p.BillingPeriod.ToString(),
            p.IsActive,
            p.ExternalProductId,
            modules,
            limits,
            p.CreatedAt,
            p.UpdatedAt);
    }
}
