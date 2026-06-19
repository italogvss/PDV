using PDV.Application.DTOs.Admin;
using PDV.Application.DTOs.Common;

namespace PDV.Application.Interfaces;

public interface IAdminService
{
    Task<PaginatedResponse<AdminWebhookEventDto>> GetWebhookEventsAsync(int page, int pageSize, string? status, string? eventType);
    Task<List<AdminSubscriptionDto>> GetAllSubscriptionsAsync();
    Task<List<AdminPaymentDto>> GetAllPaymentsAsync();
}
