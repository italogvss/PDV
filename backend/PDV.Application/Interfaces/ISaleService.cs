using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Sales;
using PDV.Domain.Enums;

namespace PDV.Application.Interfaces;

public interface ISaleService
{
    Task<PaginatedResponse<SaleResponse>> GetAllAsync(
        int page, int pageSize,
        DateTime? startDate, DateTime? endDate,
        Guid? operatorId, SaleStatus? status);

    Task<SaleDetailResponse> GetByIdAsync(Guid id);
    Task<SaleDetailResponse> CreateAsync(CreateSaleRequest request, Guid operatorId);
    Task CancelAsync(Guid id, Guid adminId);
}
