using PDV.Application.DTOs.Payments;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class PaymentHistoryService(
    IUserContext userContext,
    IPaymentRepository paymentRepository) : IPaymentHistoryService
{
    public async Task<PaymentHistoryResponse> GetHistoryAsync(int page, int pageSize)
    {
        var (data, totalCount) = await paymentRepository.GetByUserIdAsync(userContext.UserId, page, pageSize);
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        return new PaymentHistoryResponse(
            data.Select(Map).ToList(),
            page,
            pageSize,
            totalCount,
            totalPages);
    }

    private static PaymentHistoryItemResponse Map(Payment p) => new(
        p.Id,
        p.Kind.ToString(),
        p.Method.ToString(),
        p.AmountCents,
        p.Status.ToString(),
        p.PaidAt,
        p.ReceiptUrl,
        p.CardLastFour,
        p.CardBrand,
        p.PeriodStart,
        p.PeriodEnd,
        p.CreatedAt);
}
