using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Logs;

namespace PDV.Application.Interfaces;

public interface ILogService
{
    Task<PaginatedResponse<AuditLogResponse>> GetAuditLogsAsync(
        string? action, string? entityType, Guid? entityId,
        DateTime? from, DateTime? to, int page, int pageSize);
}
