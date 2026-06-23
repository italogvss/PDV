using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IPaymentRepository
{
    Task AddAsync(Payment payment);
    Task UpdateAsync(Payment payment);

    // Remoção FÍSICA dos pagamentos da assinatura (exceção ao soft delete): usado no cancelamento
    // em trial, onde não há cobrança paga e o histórico não precisa ser preservado.
    Task DeleteBySubscriptionIdAsync(Guid subscriptionId);
    Task<(IEnumerable<Payment> Data, int TotalCount)> GetByUserIdAsync(Guid userId, int page, int pageSize);
}
