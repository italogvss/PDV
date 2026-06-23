using PDV.Application.DTOs.Admin;
using PDV.Application.DTOs.Common;

namespace PDV.Application.Interfaces;

public interface IAdminService
{
    Task<PaginatedResponse<AdminWebhookEventDto>> GetWebhookEventsAsync(int page, int pageSize, string? status, string? eventType);
    Task<List<AdminSubscriptionDto>> GetAllSubscriptionsAsync();
    Task<List<AdminPaymentDto>> GetAllPaymentsAsync();
    Task<List<AdminPlanDto>> GetAllPlansAsync();
    Task<AdminPlanDto> GetPlanByIdAsync(Guid id);
    Task<AdminPlanDto> UpdatePlanAsync(Guid id, UpdatePlanRequest request);
    Task DeactivatePlanAsync(Guid id);
}
