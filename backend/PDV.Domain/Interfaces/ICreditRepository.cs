using PDV.Domain.Entities;
using PDV.Domain.Enums;

namespace PDV.Domain.Interfaces;

// Filtros da listagem de crediário. Overdue é derivado (Status Open && DueDate < hoje),
// por isso vive aqui e não como coluna.
public record CreditFilter(
    Guid? CustomerId = null,
    CreditAccountStatus? Status = null,
    bool? Overdue = null,
    DateTime? DueFrom = null,
    DateTime? DueTo = null,
    string? Search = null);

public interface ICreditRepository
{
    Task<(IEnumerable<CreditAccount> Data, int TotalCount)> GetAccountsAsync(
        CreditFilter filter, int page, int pageSize);

    Task<CreditAccount?> GetAccountByIdAsync(Guid id);
    Task<CreditAccount?> GetAccountBySaleIdAsync(Guid saleId);
    Task<Sale?> GetSaleForCreditAsync(Guid saleId);

    Task<(IEnumerable<CreditInstallment> Data, int TotalCount)> GetInstallmentsAsync(
        CreditFilter filter, int page, int pageSize);

    Task<CreditInstallment?> GetInstallmentByIdAsync(Guid id);
    Task<CreditPayment?> GetPaymentByIdAsync(Guid id);
    Task<IEnumerable<CreditPayment>> GetPaymentsByAccountAsync(Guid accountId);

    Task AddAccountAsync(CreditAccount account);

    // Baixa e estorno mexem em 3 entidades ao mesmo tempo (payment + parcela + conta) e
    // precisam de um único SaveChanges para não deixar saldo inconsistente.
    Task SaveReceiptAsync(CreditPayment payment, CreditInstallment installment, CreditAccount account);
    Task SaveReversalAsync(CreditPayment payment, CreditInstallment installment, CreditAccount account);

    Task UpdateAccountAsync(CreditAccount account);

    // Agregados para KPIs / aging — sempre sobre parcelas não canceladas.
    Task<IEnumerable<CreditInstallment>> GetOpenInstallmentsAsync();
    Task<decimal> GetReceivedBetweenAsync(DateTime start, DateTime end);
    Task<IEnumerable<CreditAccount>> GetOpenAccountsAsync();

    Task<int> PurgeAllAsync();
}
