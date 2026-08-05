using PDV.Application.DTOs.Credit;
using PDV.Domain.Entities;
using PDV.Domain.Enums;

namespace PDV.Application.Helpers;

/// <summary>
/// Fonte única do mapeamento entidade → DTO do crediário. Vive aqui porque dois módulos
/// consomem: o CreditService (tela de crediário) e o SaleService (o histórico de vendas
/// mostra a situação do crediário da venda). "Vencida" é derivado — nunca status persistido —
/// e a regra precisa ser a mesma nos dois lugares.
/// </summary>
public static class CreditMapper
{
    public static CreditAccountResponse MapAccount(CreditAccount a)
    {
        var today = DateTime.UtcNow.Date;
        var installments = a.Installments ?? [];
        var open = installments.Where(i => i.Status == CreditInstallmentStatus.Open).ToList();
        var overdue = open.Where(i => i.DueDate < today).ToList();

        return new CreditAccountResponse(
            a.Id, a.SaleId, a.CustomerId, a.CustomerName,
            a.TotalAmount, a.DownPayment, a.PaidAmount, a.TotalAmount - a.PaidAmount,
            a.InstallmentCount,
            installments.Count(i => i.Status == CreditInstallmentStatus.Paid),
            a.FirstDueDate,
            open.OrderBy(i => i.DueDate).Select(i => (DateTime?)i.DueDate).FirstOrDefault(),
            overdue.Count > 0,
            overdue.Count,
            overdue.Sum(i => i.Amount - i.PaidAmount),
            a.Status.ToString(),
            a.SettledAt, a.Note, a.CreatedAt);
    }

    public static CreditInstallmentResponse MapInstallment(CreditInstallment i, CreditAccount? account)
    {
        var today = DateTime.UtcNow.Date;
        var isOverdue = i.Status == CreditInstallmentStatus.Open && i.DueDate.Date < today;

        return new CreditInstallmentResponse(
            i.Id, i.CreditAccountId,
            account?.CustomerId ?? Guid.Empty,
            account?.CustomerName ?? string.Empty,
            i.Number,
            account?.InstallmentCount ?? 0,
            i.DueDate, i.Amount, i.PaidAmount, i.Amount - i.PaidAmount,
            i.PaidAt, i.Status.ToString(),
            isOverdue,
            isOverdue ? (today - i.DueDate.Date).Days : 0);
    }

    // Ordena por número — a ordem das parcelas é o cronograma, nunca a ordem do banco.
    public static List<CreditInstallmentResponse> MapInstallments(CreditAccount account) =>
        [.. (account.Installments ?? [])
            .OrderBy(i => i.Number)
            .Select(i => MapInstallment(i, account))];

    public static CreditPaymentResponse MapPayment(CreditPayment p) =>
        new(p.Id, p.CreditAccountId, p.CreditInstallmentId,
            p.Installment?.Number ?? 0,
            p.Amount, p.Method.ToString(), p.ReceivedAt, p.OperatorName, p.Note);

    // Referência magra da venda de origem: o crediário não gerencia a venda, só aponta
    // para ela. Os itens/desconto/taxa são responsabilidade do histórico de vendas.
    public static CreditSaleRefResponse MapSaleRef(Sale s) =>
        new(s.Id, s.CreatedAt, s.PaymentMethod.ToString(), s.Total,
            s.Status.ToString(), s.Items?.Count ?? 0);
}
