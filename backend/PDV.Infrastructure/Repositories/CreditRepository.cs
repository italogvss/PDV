using Microsoft.EntityFrameworkCore;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Persistence;

namespace PDV.Infrastructure.Repositories;

public class CreditRepository(AppDbContext context, ITenantContext tenantContext) : ICreditRepository
{
    public async Task<(IEnumerable<CreditAccount> Data, int TotalCount)> GetAccountsAsync(
        CreditFilter filter, int page, int pageSize)
    {
        var query = context.CreditAccounts
            .Include(a => a.Installments)
            .AsQueryable();

        if (filter.CustomerId.HasValue)
            query = query.Where(a => a.CustomerId == filter.CustomerId.Value);

        if (filter.Status.HasValue)
            query = query.Where(a => a.Status == filter.Status.Value);

        if (!string.IsNullOrWhiteSpace(filter.Search))
            query = query.Where(a => a.CustomerName.Contains(filter.Search));

        var today = DateTime.UtcNow.Date;

        if (filter.Overdue == true)
            query = query.Where(a => a.Installments.Any(
                i => i.Status == CreditInstallmentStatus.Open && i.DueDate < today));
        else if (filter.Overdue == false)
            query = query.Where(a => !a.Installments.Any(
                i => i.Status == CreditInstallmentStatus.Open && i.DueDate < today));

        // Um Any() SÓ com as duas pontas: a conta precisa ter uma parcela DENTRO do intervalo.
        // Com dois Any() independentes, uma conta com parcela em janeiro e outra em dezembro
        // satisfazia "alguma >= mar" e "alguma <= mai" e aparecia num filtro de março a maio onde
        // não tem parcela nenhuma.
        if (filter.DueFrom.HasValue || filter.DueTo.HasValue)
        {
            var from = filter.DueFrom;
            var to = filter.DueTo;
            query = query.Where(a => a.Installments.Any(i =>
                (from == null || i.DueDate >= from.Value) &&
                (to == null || i.DueDate <= to.Value)));
        }

        var total = await query.CountAsync();
        var data = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (data, total);
    }

    public async Task<CreditAccount?> GetAccountByIdAsync(Guid id) =>
        await context.CreditAccounts
            .Include(a => a.Installments.OrderBy(i => i.Number))
            .FirstOrDefaultAsync(a => a.Id == id);

    public async Task<CreditAccount?> GetAccountBySaleIdAsync(Guid saleId) =>
        await context.CreditAccounts
            .Include(a => a.Installments)
            .FirstOrDefaultAsync(a => a.SaleId == saleId);

    public async Task<IReadOnlyDictionary<Guid, CreditAccount>> GetAccountsBySaleIdsAsync(
        IReadOnlyCollection<Guid> saleIds)
    {
        if (saleIds.Count == 0)
            return new Dictionary<Guid, CreditAccount>();

        var accounts = await context.CreditAccounts
            .Include(a => a.Installments)
            .Where(a => saleIds.Contains(a.SaleId))
            .ToListAsync();

        return accounts.ToDictionary(a => a.SaleId);
    }

    public async Task<Sale?> GetSaleForCreditAsync(Guid saleId) =>
        await context.Sales
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == saleId);

    public async Task<(IEnumerable<CreditInstallment> Data, int TotalCount)> GetInstallmentsAsync(
        CreditFilter filter, int page, int pageSize)
    {
        var query = context.CreditInstallments
            .Include(i => i.Account)
            .Where(i => i.Status != CreditInstallmentStatus.Cancelled)
            .AsQueryable();

        if (filter.CustomerId.HasValue)
            query = query.Where(i => i.Account!.CustomerId == filter.CustomerId.Value);

        if (!string.IsNullOrWhiteSpace(filter.Search))
            query = query.Where(i => i.Account!.CustomerName.Contains(filter.Search));

        var today = DateTime.UtcNow.Date;

        if (filter.Overdue == true)
            query = query.Where(i => i.Status == CreditInstallmentStatus.Open && i.DueDate < today);
        else if (filter.Overdue == false)
            query = query.Where(i => i.Status == CreditInstallmentStatus.Paid || i.DueDate >= today);

        if (filter.Status == CreditAccountStatus.Paid)
            query = query.Where(i => i.Status == CreditInstallmentStatus.Paid);
        else if (filter.Status == CreditAccountStatus.Open)
            query = query.Where(i => i.Status == CreditInstallmentStatus.Open);

        if (filter.DueFrom.HasValue)
            query = query.Where(i => i.DueDate >= filter.DueFrom.Value);

        if (filter.DueTo.HasValue)
            query = query.Where(i => i.DueDate <= filter.DueTo.Value);

        var total = await query.CountAsync();
        var data = await query
            .OrderBy(i => i.DueDate)
            .ThenBy(i => i.Number)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (data, total);
    }

    public async Task<CreditInstallment?> GetInstallmentByIdAsync(Guid id) =>
        await context.CreditInstallments
            .Include(i => i.Account)
            .FirstOrDefaultAsync(i => i.Id == id);

    public async Task<CreditPayment?> GetPaymentByIdAsync(Guid id) =>
        await context.CreditPayments
            .Include(p => p.Installment)
            .FirstOrDefaultAsync(p => p.Id == id);

    public async Task<IEnumerable<CreditPayment>> GetPaymentsByAccountAsync(Guid accountId) =>
        await context.CreditPayments
            .Include(p => p.Installment)
            .Where(p => p.CreditAccountId == accountId)
            .OrderByDescending(p => p.ReceivedAt)
            .ToListAsync();

    public async Task AddAccountAsync(CreditAccount account, Sale sale)
    {
        await context.CreditAccounts.AddAsync(account);
        context.Sales.Update(sale);
        await context.SaveChangesAsync();
    }

    public async Task SaveReceiptAsync(CreditPayment payment, CreditInstallment installment, CreditAccount account)
    {
        await context.CreditPayments.AddAsync(payment);
        context.CreditInstallments.Update(installment);
        context.CreditAccounts.Update(account);
        await context.SaveChangesAsync();
    }

    // Estorno é delete FÍSICO do recebimento (mesma escolha de Expense): um recebimento
    // lançado errado não deve continuar somando no histórico do cliente.
    public async Task SaveReversalAsync(CreditPayment payment, CreditInstallment installment, CreditAccount account)
    {
        context.CreditPayments.Remove(payment);
        context.CreditInstallments.Update(installment);
        context.CreditAccounts.Update(account);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAccountAsync(CreditAccount account)
    {
        context.CreditAccounts.Update(account);
        await context.SaveChangesAsync();
    }

    public async Task<IEnumerable<CreditInstallment>> GetOpenInstallmentsAsync() =>
        await context.CreditInstallments
            .Include(i => i.Account)
            .Where(i => i.Status == CreditInstallmentStatus.Open)
            .ToListAsync();

    // Recebido no período = baixas de parcela + entradas. A entrada não é um CreditPayment (é paga
    // no ato da venda, com o método da venda), então precisa entrar aqui explicitamente — sem isso
    // o "recebido" subestima toda venda fiado com entrada.
    public async Task<decimal> GetReceivedBetweenAsync(DateTime start, DateTime end)
    {
        // Venda cancelada não conta — mesmo critério das entradas logo abaixo e das superfícies
        // equivalentes no ReportService. A assimetria entre os dois trechos deste método fazia o
        // KPI "Recebido no mês" divergir do resumo financeiro em Caixa.
        var installmentReceipts = await context.CreditPayments
            .Where(p => p.ReceivedAt >= start && p.ReceivedAt <= end
                     && context.CreditAccounts.Any(a => a.Id == p.CreditAccountId
                                                     && a.Sale!.Status == SaleStatus.Active))
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        // Datada pela VENDA (não pela conta): é nela que o dinheiro entrou no caixa.
        // Venda cancelada não conta como recebimento.
        var downPayments = await context.CreditAccounts
            .Where(a => a.DownPayment > 0
                     && a.Sale!.Status == SaleStatus.Active
                     && a.Sale.CreatedAt >= start
                     && a.Sale.CreatedAt <= end)
            .SumAsync(a => (decimal?)a.DownPayment) ?? 0m;

        return installmentReceipts + downPayments;
    }

    public async Task<IEnumerable<CreditAccount>> GetOpenAccountsAsync() =>
        await context.CreditAccounts
            .Include(a => a.Installments)
            .Where(a => a.Status == CreditAccountStatus.Open)
            .ToListAsync();

    // IgnoreQueryFilters: remove TUDO do tenant no purge de LGPD (crediário não tem soft-delete).
    // O filtro de TenantId é reaplicado manualmente para não vazar exclusão entre tenants.
    // Ordem importa: pagamentos → parcelas → contas (FKs em cascata do filho para o pai).
    public async Task<int> PurgeAllAsync()
    {
        var tenantId = tenantContext.TenantId;

        var payments = await context.CreditPayments
            .IgnoreQueryFilters()
            .Where(p => p.TenantId == tenantId)
            .ExecuteDeleteAsync();

        var installments = await context.CreditInstallments
            .IgnoreQueryFilters()
            .Where(i => i.TenantId == tenantId)
            .ExecuteDeleteAsync();

        var accounts = await context.CreditAccounts
            .IgnoreQueryFilters()
            .Where(a => a.TenantId == tenantId)
            .ExecuteDeleteAsync();

        return payments + installments + accounts;
    }
}
