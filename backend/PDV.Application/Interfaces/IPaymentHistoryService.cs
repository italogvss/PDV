using PDV.Application.DTOs.Payments;

namespace PDV.Application.Interfaces;

public interface IPaymentHistoryService
{
    Task<PaymentHistoryResponse> GetHistoryAsync(int page, int pageSize);
}
