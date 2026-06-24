using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Logs;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class LogService(AppDbContext context) : ILogService
{
    public async Task<PaginatedResponse<AuditLogResponse>> GetAuditLogsAsync(
        string? action, string? entityType, Guid? entityId,
        DateTime? from, DateTime? to, int page, int pageSize)
    {
        var query = context.AuditLogs.AsNoTracking().AsQueryable();

        if (action is not null && Enum.TryParse<AuditAction>(action, true, out var parsedAction))
            query = query.Where(l => l.Action == parsedAction);
        if (entityType is not null && Enum.TryParse<AuditEntityType>(entityType, true, out var parsedType))
            query = query.Where(l => l.EntityType == parsedType);
        if (entityId.HasValue)
            query = query.Where(l => l.EntityId == entityId.Value);
        if (from.HasValue)
            query = query.Where(l => l.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(l => l.CreatedAt <= to.Value);

        query = query.OrderByDescending(l => l.CreatedAt);

        var totalCount = await query.CountAsync();
        var data = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        var mapped = data.Select(Map);
        return new PaginatedResponse<AuditLogResponse>(mapped, page, pageSize, totalCount, totalPages);
    }

    private static AuditLogResponse Map(AuditLog l) => new(
        l.Id,
        l.Action.ToString(),
        l.EntityType.ToString(),
        l.EntityId,
        l.EntityName,
        l.PerformedByUserId,
        l.PerformedByName,
        l.DetailsJson is null ? null : JsonSerializer.Deserialize<JsonElement>(l.DetailsJson),
        l.CreatedAt);
}
