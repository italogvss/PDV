using PDV.Domain.Entities;

namespace PDV.Domain.Interfaces;

public interface IPaymentRepository
{
    Task AddAsync(Payment payment);
    Task UpdateAsync(Payment payment);
    Task<(IEnumerable<Payment> Data, int TotalCount)> GetByUserIdAsync(Guid userId, int page, int pageSize);

    // Cobrança mais recente da assinatura. Se ela está `Failed`, o dunning está em curso — uma
    // retentativa bem-sucedida registra um `Paid` mais novo, que passa a ser o retornado aqui.
    Task<Payment?> GetLatestBySubscriptionIdAsync(Guid subscriptionId);

    // Cobranças pagas desde que a assinatura passou a valer (Subscription.StartedAt). É o conjunto
    // a estornar no cancelamento dentro da janela de arrependimento: dentro de 7 dias não há
    // renovação, mas pode haver a fatura proporcional de um upgrade além da fatura inicial.
    Task<IReadOnlyList<Payment>> GetPaidBySubscriptionSinceAsync(Guid subscriptionId, DateTime since);

    // Cancela cobranças Pending órfãs (checkout abandonado há mais que o TTL) — evita que o
    // histórico mostre "Pendente" indefinidamente para um pagamento que nunca vai ser confirmado.
    Task<int> ExpireStalePendingAsync(DateTime cutoff);
}
