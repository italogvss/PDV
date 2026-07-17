namespace PDV.Application.DTOs.Admin;

public record AdminWebhookEventDto(
    Guid Id,
    string Provider,
    string EventId,
    string EventType,
    string Status,
    DateTime ReceivedAt,
    DateTime? ProcessedAt,
    string? Error);

public record AdminSubscriptionDto(
    Guid Id,
    string UserEmail,
    string UserName,
    string PlanName,
    string Status,
    string Method,
    string Provider,
    bool IsRenewable,
    string? GatewaySubscriptionId,
    string? GatewayCustomerId,
    DateTime? TrialEndsAt,
    DateTime? CurrentPeriodEnd,
    DateTime? CanceledAt,
    DateTime CreatedAt);

public record AdminPaymentDto(
    Guid Id,
    string UserEmail,
    string UserName,
    string GatewayChargeId,
    string Kind,
    string Method,
    int AmountCents,
    string Status,
    string Provider,
    string? CouponCode,
    DateTime? PaidAt,
    DateTime? PeriodStart,
    DateTime? PeriodEnd,
    string? ReceiptUrl,
    DateTime CreatedAt);

public record AdminConfigDto(
    string ApiKey,
    string WebhookSecret,
    string Provider,
    // Quantos dos planos do catálogo têm um preço configurado no gateway — um alarme rápido para
    // configuração pela metade.
    int ConfiguredPriceCount);

public record AdminPlanDto(
    Guid Id,
    string Name,
    string? Description,
    int PriceCents,
    string BillingPeriod,
    bool IsActive,
    string ExternalProductId,
    IReadOnlyList<string> Modules,
    IReadOnlyDictionary<string, int> Limits,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record UpdatePlanRequest(
    string Name,
    string? Description,
    int PriceCents);

// ── Cupons ────────────────────────────────────────────────────────────────────────────────────
// Espelham 1:1 os campos neutros de CouponResult/CreateCouponRequest (PDV.Application/DTOs/Payments)
// — o Stripe é a única fonte da verdade, não há entidade local nem persistência.

public record AdminCouponDto(
    string PromotionCodeId,
    string CouponId,
    string Code,
    string? Name,
    decimal? PercentOff,
    int? AmountOffCents,
    string Duration,
    int? DurationInMonths,
    int? MaxRedemptions,
    int TimesRedeemed,
    DateTime? ExpiresAt,
    bool Active,
    DateTime CreatedAt);

public record AdminCreateCouponRequest(
    string Code,
    string? Name,
    decimal? PercentOff,
    int? AmountOffCents,
    string Duration,
    int? DurationInMonths,
    int? MaxRedemptions,
    DateTime? ExpiresAt);

// Métricas agregadas da plataforma para a Visão geral do admin. Valores monetários em centavos.
public record AdminOverviewDto(
    int MrrCents,                    // receita recorrente mensal (assinaturas Active, anual normalizado /12)
    int ArrCents,                    // MRR * 12
    int ActiveSubscriptions,
    int TrialingSubscriptions,
    int CanceledSubscriptions,
    int ExpiredSubscriptions,
    int PastDueSubscriptions,        // Active com período vencido (renovação falhou → acesso caiu)
    int MonthRevenueCents,           // pagamentos Paid no mês corrente
    int MonthRefundedCents,          // pagamentos Refunded no mês corrente
    int FailedPaymentsCount,         // cobranças recusadas (dunning)
    int TotalTenants,                // lojas ativas
    int TotalUsers,
    int AccountsInDeletion,          // contas com exclusão solicitada (LGPD)
    int WebhookFailures24h,          // eventos de webhook com falha nas últimas 24h
    int ActivePlansMissingGateway,   // planos ativos sem ExternalProductId (config pela metade)
    IReadOnlyList<AdminPlanDistributionDto> PlanDistribution,
    IReadOnlyList<AdminRevenuePointDto> RevenueByMonth);

public record AdminPlanDistributionDto(string PlanName, int ActiveCount);

// Ponto da série de receita mensal. Month no formato "yyyy-MM".
public record AdminRevenuePointDto(string Month, int RevenueCents);

// ── Fase 3: Suporte & Conteúdo ────────────────────────────────────────────────────────────────

// Mensagem de contato/suporte (ContactMessage) — remetente resolvido via join com User.
public record AdminContactMessageDto(
    Guid Id,
    Guid TenantId,
    Guid UserId,
    string SenderName,
    string SenderEmail,
    string Category,
    string Subject,
    string Body,
    string Status,
    string? ExpectedBehavior,
    string? Reproducibility,
    string? PageContext,
    string? AppVersion,
    string? Browser,
    string? ScreenResolution,
    string? Platform,
    DateTime CreatedAt);

public record UpdateContactStatusRequest(string Status);

public record AdminAnnouncementDto(
    Guid Id,
    string Title,
    string Body,
    string Type,
    string? ImageUrl,
    string? CtaLabel,
    string? CtaUrl,
    DateTime? PublishAt,
    DateTime? ExpiresAt,
    string? TargetPlanCode,
    string? TargetRole,
    int Priority,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);

// Corpo de criação/edição de anúncio. Type e TargetRole vêm como string (nomes dos enums).
public record AnnouncementRequest(
    string Title,
    string Body,
    string Type,
    string? ImageUrl,
    string? CtaLabel,
    string? CtaUrl,
    DateTime? PublishAt,
    DateTime? ExpiresAt,
    string? TargetPlanCode,
    string? TargetRole,
    int Priority);

// ── Conteúdo Legal ────────────────────────────────────────────────────────────────────────────

public record AdminLegalDocumentDto(
    Guid Id,
    string Type,
    string Content,
    DateTime UpdatedAt);

public record UpdateLegalDocumentRequest(string Content);

// ── Fase 4: Observabilidade ───────────────────────────────────────────────────────────────────

public record AdminSystemLogDto(
    Guid Id,
    string Level,
    string Message,
    string? Exception,
    string? SourceContext,
    string? RequestPath,
    DateTime CreatedAt);

// Resultado de um health check individual (MySQL, storage...).
public record AdminHealthEntryDto(
    string Name,
    string Status,          // Healthy | Degraded | Unhealthy
    string? Description,
    double DurationMs);

public record AdminHealthDto(
    string Status,          // status agregado
    double TotalDurationMs,
    IReadOnlyList<AdminHealthEntryDto> Entries);

// Evento unificado da timeline da plataforma — funde AccessLog, WebhookEvent e AuditLog.
// Source identifica a origem; Actor é quem/o quê originou; Detail é o complemento livre.
public record AdminPlatformEventDto(
    Guid Id,
    string Source,          // Access | Webhook | Audit
    string Event,
    string Actor,
    string? Detail,
    DateTime OccurredAt);

// ── Conformidade / LGPD ───────────────────────────────────────────────────────────────────────

// Entrada do ledger de encerramento (AccountDeletion) — a prova de conformidade do pedido
// EXPLÍCITO de exclusão de conta ou de loja.
public record AdminAccountDeletionDto(
    Guid Id,
    Guid UserId,
    string UserEmail,
    string Scope,               // Account | SingleStore
    Guid? TenantId,             // preenchido só no escopo SingleStore
    string Path,                // DeleteNow | AtPeriodEnd
    string Status,              // Requested | Cancelled | Effected | Purged
    DateTime RequestedAt,
    DateTime CarencyStartsAt,
    DateTime ScheduledDeletionAt,
    DateTime? EffectedAt,
    DateTime? PurgeAfter,
    bool SubscriptionCanceled,
    bool RefundRequested);

// Loja dentro do pipeline de retenção/exclusão. Cobre os dois caminhos: o agendamento passivo
// (perda de acesso sem pedido, RetentionDefaults.DaysAfterAccessLoss) via ScheduledDeletionAt, e o
// legal-hold fiscal pós-strip via LegalHoldUntil. O estágio é derivado no frontend a partir das datas.
public record AdminRetentionTenantDto(
    Guid Id,
    string FantasyName,
    string OwnerEmail,
    bool IsActive,
    DateTime? ScheduledDeletionAt,
    DateTime? LegalHoldUntil,
    DateTime CreatedAt);

// Registro de acesso (Marco Civil art. 15). UserEmail resolvido por left join — vira "—" após a
// anonimização, já que o AccessLog não tem FK para User (sobrevive de propósito).
public record AdminAccessLogDto(
    Guid Id,
    Guid UserId,
    string UserEmail,
    string Event,               // LoggedIn | LoggedOut
    string? IpAddress,
    string? UserAgent,
    DateTime CreatedAt);
