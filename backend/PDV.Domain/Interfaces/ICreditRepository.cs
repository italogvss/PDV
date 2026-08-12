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

    // Usado pelo histórico de vendas: resolve o crediário de uma página inteira de vendas
    // numa query só, indexado por SaleId (a relação Sale↔CreditAccount é 1:1).
    Task<IReadOnlyDictionary<Guid, CreditAccount>> GetAccountsBySaleIdsAsync(IReadOnlyCollection<Guid> saleIds);

    Task<(IEnumerable<CreditInstallment> Data, int TotalCount)> GetInstallmentsAsync(
        CreditFilter filter, int page, int pageSize);

    Task<CreditInstallment?> GetInstallmentByIdAsync(Guid id);
    Task<CreditPayment?> GetPaymentByIdAsync(Guid id);
    Task<IEnumerable<CreditPayment>> GetPaymentsByAccountAsync(Guid accountId);

    // A venda vai junto porque abrir crediário REESCREVE a taxa dela (passa a incidir só sobre a
    // entrada) — conta e venda precisam cair no mesmo SaveChanges.
    Task AddAccountAsync(CreditAccount account, Sale sale);

    // Baixa e estorno mexem em 3 entidades ao mesmo tempo (payment + parcela + conta) e
    // precisam de um único SaveChanges para não deixar saldo inconsistente.
    Task SaveReceiptAsync(CreditPayment payment, CreditInstallment installment, CreditAccount account);
    Task SaveReversalAsync(CreditPayment payment, CreditInstallment installment, CreditAccount account);

    Task UpdateAccountAsync(CreditAccount account);

    // Agregados para KPIs / aging — sempre sobre parcelas não canceladas.
    Task<IEnumerable<CreditInstallment>> GetOpenInstallmentsAsync();

    // Dinheiro que ENTROU no período: baixas de parcela + entradas (a entrada é paga no ato da
    // venda, por isso é datada pela venda, não pela conta).
    Task<decimal> GetReceivedBetweenAsync(DateTime start, DateTime end);
    Task<IEnumerable<CreditAccount>> GetOpenAccountsAsync();

    Task<int> PurgeAllAsync();
}
