using PDV.Application.DTOs.Credit;
using PDV.Domain.Entities;

namespace PDV.Application.Helpers;

/// <summary>
/// Fonte única da matemática de recebível/inadimplência do crediário. Vive aqui porque dois módulos
/// consomem os mesmos números: o painel da tela de Crediário (<c>CreditService</c>, feature
/// <c>creditDashboard</c>) e a seção Crediário dos Relatórios (<c>ReportService</c>, gate
/// <c>advancedReports</c>). Cada service mantém o seu gate; a conta é uma só.
///
/// Convenção: só parcelas <b>em aberto</b> entram no recebível — parcela cancelada não é cobrável
/// e parcela quitada não é saldo. "Vencida" é derivado de <c>DueDate &lt; hoje</c>, nunca persistido.
/// </summary>
public static class CreditAnalytics
{
    public static decimal Balance(CreditInstallment i) => i.Amount - i.PaidAmount;

    public static decimal TotalReceivable(IEnumerable<CreditInstallment> openInstallments) =>
        openInstallments.Sum(Balance);

    public static decimal OverdueAmount(IEnumerable<CreditInstallment> openInstallments, DateTime today) =>
        openInstallments.Where(i => i.DueDate.Date < today).Sum(Balance);

    /// <summary>Percentual do saldo a receber que já está vencido. 0 quando não há recebível.</summary>
    public static decimal DefaultRate(decimal totalReceivable, decimal overdueAmount) =>
        totalReceivable > 0 ? Math.Round(overdueAmount / totalReceivable * 100m, 2) : 0m;

    /// <summary>Faixas de atraso do saldo em aberto. Ordem = ordem de exibição.</summary>
    public static List<CreditAgingBucket> Buckets(
        IReadOnlyCollection<CreditInstallment> openInstallments, DateTime today)
    {
        // Dias de atraso: negativo/zero = ainda não venceu.
        var aged = openInstallments
            .Select(i => (Days: (today - i.DueDate.Date).Days, Balance: Balance(i)))
            .ToList();

        CreditAgingBucket Bucket(string label, Func<int, bool> match)
        {
            var matched = aged.Where(a => match(a.Days)).ToList();
            return new CreditAgingBucket(label, matched.Sum(a => a.Balance), matched.Count);
        }

        return
        [
            Bucket("A vencer", d => d <= 0),
            Bucket("1 a 30 dias", d => d is >= 1 and <= 30),
            Bucket("31 a 60 dias", d => d is >= 31 and <= 60),
            Bucket("61 a 90 dias", d => d is >= 61 and <= 90),
            Bucket("Mais de 90 dias", d => d > 90),
        ];
    }

    /// <summary>Maiores devedores por saldo em aberto. Parcelas sem conta carregada são ignoradas.</summary>
    public static List<CreditTopDebtor> TopDebtors(
        IEnumerable<CreditInstallment> openInstallments, DateTime today, int limit = 10) =>
        [.. openInstallments
            .Where(i => i.Account is not null)
            .GroupBy(i => new { i.Account!.CustomerId, i.Account!.CustomerName })
            .Select(g => new CreditTopDebtor(
                g.Key.CustomerId,
                g.Key.CustomerName,
                g.Sum(Balance),
                g.Where(i => i.DueDate.Date < today).Sum(Balance),
                g.Select(i => i.CreditAccountId).Distinct().Count()))
            .OrderByDescending(d => d.Balance)
            .Take(limit)];

    public static CreditAgingResponse BuildAging(
        IReadOnlyCollection<CreditInstallment> openInstallments, DateTime today)
    {
        var totalReceivable = TotalReceivable(openInstallments);
        var overdueAmount = OverdueAmount(openInstallments, today);

        return new CreditAgingResponse(
            Buckets(openInstallments, today),
            TopDebtors(openInstallments, today),
            totalReceivable,
            overdueAmount,
            DefaultRate(totalReceivable, overdueAmount));
    }
}
