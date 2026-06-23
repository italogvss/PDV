using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Logs;

namespace PDV.Application.Interfaces;

public interface ILogService
{
    Task<PaginatedResponse<StockMovementResponse>> GetStockMovementsAsync(
        Guid? productId, string? type, DateTime? from, DateTime? to, int page, int pageSize);

    Task<PaginatedResponse<PriceHistoryResponse>> GetPriceHistoryAsync(
        Guid? productId, Guid? serviceId, DateTime? from, DateTime? to, int page, int pageSize);

    Task<PaginatedResponse<AppointmentStatusLogResponse>> GetAppointmentStatusLogsAsync(
        Guid? appointmentId, DateTime? from, DateTime? to, int page, int pageSize);
}
