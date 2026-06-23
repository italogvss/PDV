using Microsoft.EntityFrameworkCore;
using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Logs;
using PDV.Application.Interfaces;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Services;

public class LogService(AppDbContext context) : ILogService
{
    public async Task<PaginatedResponse<StockMovementResponse>> GetStockMovementsAsync(
        Guid? productId, string? type, DateTime? from, DateTime? to, int page, int pageSize)
    {
        var query = context.StockMovements.AsQueryable();

        if (productId.HasValue)
            query = query.Where(m => m.ProductId == productId.Value);
        if (type is not null && Enum.TryParse<StockMovementType>(type, true, out var parsedType))
            query = query.Where(m => m.Type == parsedType);
        if (from.HasValue)
            query = query.Where(m => m.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(m => m.CreatedAt <= to.Value);

        query = query.OrderByDescending(m => m.CreatedAt);

        var totalCount = await query.CountAsync();
        var data = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        var mapped = data.Select(m => new StockMovementResponse(
            m.Id, m.ProductId, m.ProductName, m.Type.ToString(), m.Quantity,
            m.UnitCost, m.SupplierId, m.SupplierName, m.Note,
            m.CreatedByUserId, m.CreatedByName, m.CreatedAt));

        return new PaginatedResponse<StockMovementResponse>(mapped, page, pageSize, totalCount, totalPages);
    }

    public async Task<PaginatedResponse<PriceHistoryResponse>> GetPriceHistoryAsync(
        Guid? productId, Guid? serviceId, DateTime? from, DateTime? to, int page, int pageSize)
    {
        if (productId.HasValue && serviceId.HasValue)
            throw new BusinessException("Informe apenas productId ou serviceId, não ambos.");

        IEnumerable<PriceHistoryResponse> mapped;
        int totalCount;

        if (productId.HasValue)
        {
            var query = context.ProductPriceHistories.Where(h => h.ProductId == productId.Value);
            if (from.HasValue) query = query.Where(h => h.CreatedAt >= from.Value);
            if (to.HasValue) query = query.Where(h => h.CreatedAt <= to.Value);
            query = query.OrderByDescending(h => h.CreatedAt);
            totalCount = await query.CountAsync();
            var data = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            mapped = data.Select(h => new PriceHistoryResponse(
                h.Id, "Product", h.ProductId, h.ProductName,
                h.OldPrice, h.NewPrice, h.ChangedByUserId, h.ChangedByName, h.CreatedAt));
        }
        else if (serviceId.HasValue)
        {
            var query = context.ServicePriceHistories.Where(h => h.ServiceId == serviceId.Value);
            if (from.HasValue) query = query.Where(h => h.CreatedAt >= from.Value);
            if (to.HasValue) query = query.Where(h => h.CreatedAt <= to.Value);
            query = query.OrderByDescending(h => h.CreatedAt);
            totalCount = await query.CountAsync();
            var data = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            mapped = data.Select(h => new PriceHistoryResponse(
                h.Id, "Service", h.ServiceId, h.ServiceName,
                h.OldPrice, h.NewPrice, h.ChangedByUserId, h.ChangedByName, h.CreatedAt));
        }
        else
        {
            // Sem filtro de entidade: retorna histórico de preços de produtos e serviços combinados
            var productQuery = context.ProductPriceHistories.AsQueryable();
            var serviceQuery = context.ServicePriceHistories.AsQueryable();

            if (from.HasValue)
            {
                productQuery = productQuery.Where(h => h.CreatedAt >= from.Value);
                serviceQuery = serviceQuery.Where(h => h.CreatedAt >= from.Value);
            }
            if (to.HasValue)
            {
                productQuery = productQuery.Where(h => h.CreatedAt <= to.Value);
                serviceQuery = serviceQuery.Where(h => h.CreatedAt <= to.Value);
            }

            var productData = await productQuery.ToListAsync();
            var serviceData = await serviceQuery.ToListAsync();

            var all = productData
                .Select(h => new PriceHistoryResponse(
                    h.Id, "Product", h.ProductId, h.ProductName,
                    h.OldPrice, h.NewPrice, h.ChangedByUserId, h.ChangedByName, h.CreatedAt))
                .Concat(serviceData
                    .Select(h => new PriceHistoryResponse(
                        h.Id, "Service", h.ServiceId, h.ServiceName,
                        h.OldPrice, h.NewPrice, h.ChangedByUserId, h.ChangedByName, h.CreatedAt)))
                .OrderByDescending(h => h.ChangedAt)
                .ToList();

            totalCount = all.Count;
            mapped = all.Skip((page - 1) * pageSize).Take(pageSize);
        }

        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        return new PaginatedResponse<PriceHistoryResponse>(mapped, page, pageSize, totalCount, totalPages);
    }

    public async Task<PaginatedResponse<AppointmentStatusLogResponse>> GetAppointmentStatusLogsAsync(
        Guid? appointmentId, DateTime? from, DateTime? to, int page, int pageSize)
    {
        var query = context.AppointmentStatusLogs.AsQueryable();

        if (appointmentId.HasValue)
            query = query.Where(l => l.AppointmentId == appointmentId.Value);
        if (from.HasValue)
            query = query.Where(l => l.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(l => l.CreatedAt <= to.Value);

        query = query.OrderByDescending(l => l.CreatedAt);

        var totalCount = await query.CountAsync();
        var data = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        var mapped = data.Select(l => new AppointmentStatusLogResponse(
            l.Id, l.AppointmentId,
            l.FromStatus.ToString(), l.ToStatus.ToString(),
            l.ChangedByUserId, l.ChangedByName, l.CreatedAt));

        return new PaginatedResponse<AppointmentStatusLogResponse>(mapped, page, pageSize, totalCount, totalPages);
    }
}
