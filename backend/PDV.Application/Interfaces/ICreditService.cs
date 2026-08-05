using PDV.Application.DTOs.Common;
using PDV.Application.DTOs.Credit;
using PDV.Domain.Interfaces;

namespace PDV.Application.Interfaces;

public interface ICreditService
{
    // Cria a conta de crediário de uma venda existente. Quando o PDV for reformulado, o
    // SaleService chama este método direto, dentro da transação da venda.
    Task<CreditAccountDetailResponse> CreateForSaleAsync(CreateCreditAccountRequest request);

    Task<PaginatedResponse<CreditAccountResponse>> GetAccountsAsync(CreditFilter filter, int page, int pageSize);
    Task<CreditAccountDetailResponse> GetAccountAsync(Guid id);
    Task<PaginatedResponse<CreditInstallmentResponse>> GetInstallmentsAsync(CreditFilter filter, int page, int pageSize);

    Task<CreditPaymentResponse> ReceiveAsync(Guid installmentId, ReceiveInstallmentRequest request);
    Task ReverseAsync(Guid paymentId);
    Task<CreditAccountResponse> CancelAccountAsync(Guid id);

    Task<CreditSummaryResponse> GetSummaryAsync();
    Task<CreditAgingResponse> GetAgingAsync();
    Task<CreditReminderResponse> GetReminderAsync(Guid installmentId);
}
