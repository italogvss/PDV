using PDV.Application.DTOs.Admin;
using PDV.Application.DTOs.Common;
using PDV.Domain.Enums;

namespace PDV.Application.Interfaces;

public interface IAdminService
{
    Task<AdminOverviewDto> GetOverviewAsync();
    Task<PaginatedResponse<AdminWebhookEventDto>> GetWebhookEventsAsync(int page, int pageSize, string? status, string? eventType);
    Task<List<AdminSubscriptionDto>> GetAllSubscriptionsAsync();
    Task<List<AdminPaymentDto>> GetAllPaymentsAsync();
    Task<List<AdminPlanDto>> GetAllPlansAsync();
    Task<AdminPlanDto> GetPlanByIdAsync(Guid id);
    Task<AdminPlanDto> UpdatePlanAsync(Guid id, UpdatePlanRequest request);
    Task DeactivatePlanAsync(Guid id);

    // Cupons — repassam direto pro gateway (Stripe), sem tocar o banco.
    Task<List<AdminCouponDto>> GetCouponsAsync();
    Task<AdminCouponDto> CreateCouponAsync(AdminCreateCouponRequest request);
    Task DeactivateCouponAsync(string promotionCodeId);

    // Fase 3 — Suporte & Conteúdo.
    Task<List<AdminContactMessageDto>> GetContactMessagesAsync();
    Task<AdminContactMessageDto> UpdateContactStatusAsync(Guid id, UpdateContactStatusRequest request);
    Task<List<AdminAnnouncementDto>> GetAnnouncementsAsync();
    Task<AdminAnnouncementDto> CreateAnnouncementAsync(AnnouncementRequest request);
    Task<AdminAnnouncementDto> UpdateAnnouncementAsync(Guid id, AnnouncementRequest request);
    Task DeactivateAnnouncementAsync(Guid id);
    Task<List<AdminLegalDocumentDto>> GetLegalDocumentsAsync();
    Task<AdminLegalDocumentDto> UpdateLegalDocumentAsync(LegalDocumentType type, UpdateLegalDocumentRequest request);

    // Fase 4 — Observabilidade.
    Task<PaginatedResponse<AdminSystemLogDto>> GetSystemLogsAsync(int page, int pageSize, string? level);
    Task<PaginatedResponse<AdminPlatformEventDto>> GetPlatformEventsAsync(int page, int pageSize, string? source);

    // Conformidade / LGPD.
    Task<List<AdminAccountDeletionDto>> GetAccountDeletionsAsync();
    Task<List<AdminRetentionTenantDto>> GetRetentionTenantsAsync();
    Task<PaginatedResponse<AdminAccessLogDto>> GetAccessLogsAsync(int page, int pageSize);
}
