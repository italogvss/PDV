using System.ComponentModel.DataAnnotations.Schema;
using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Parcela de uma conta de crediário. Aceita baixa parcial: PaidAmount cresce a cada
// CreditPayment e a parcela só vira Paid quando o saldo zera.
public class CreditInstallment : BaseEntity
{
    public Guid TenantId { get; set; }

    public Guid CreditAccountId { get; set; }
    public CreditAccount? Account { get; set; }

    // Sequencial dentro da conta, começando em 1.
    public int Number { get; set; }

    // Data pura (00:00) — sem componente de hora, como Expense.DueDate.
    public DateTime DueDate { get; set; }

    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }

    // Preenchido só na quitação integral da parcela.
    public DateTime? PaidAt { get; set; }

    public CreditInstallmentStatus Status { get; set; } = CreditInstallmentStatus.Open;

    public ICollection<CreditPayment> Payments { get; set; } = [];

    [NotMapped]
    public decimal Balance => Amount - PaidAmount;
}
