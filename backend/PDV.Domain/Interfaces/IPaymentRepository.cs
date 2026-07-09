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

    // Cancela cobranças Pending órfãs (checkout abandonado há mais que o TTL) — evita que o
    // histórico mostre "Pendente" indefinidamente para um pagamento que nunca vai ser confirmado.
    Task<int> ExpireStalePendingAsync(DateTime cutoff);
}
