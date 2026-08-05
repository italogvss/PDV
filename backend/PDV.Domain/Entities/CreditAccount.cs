using System.ComponentModel.DataAnnotations.Schema;
using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Conta de crediário (venda fiado). Nasce SEMPRE de uma venda — relação 1:1 com Sale.
// O saldo devedor é distribuído em CreditInstallment; cada baixa gera um CreditPayment.
public class CreditAccount : BaseEntity
{
    public Guid TenantId { get; set; }

    public Guid SaleId { get; set; }
    public Sale? Sale { get; set; }

    // Fiado exige cliente identificado — diferente da venda, aqui CustomerId é obrigatório.
    public Guid CustomerId { get; set; }
    public Customer? Customer { get; set; }

    // Snapshot do nome no momento da criação, mesmo padrão de Sale.CustomerName.
    public string CustomerName { get; set; } = string.Empty;

    // Valor financiado = Sale.Total - DownPayment.
    public decimal TotalAmount { get; set; }

    // Entrada paga no ato da venda (0 quando não houve).
    public decimal DownPayment { get; set; }

    // Denormalizado: soma dos CreditPayment da conta. Mantido em transação junto com as parcelas.
    public decimal PaidAmount { get; set; }

    public int InstallmentCount { get; set; }
    public DateTime FirstDueDate { get; set; }

    public CreditAccountStatus Status { get; set; } = CreditAccountStatus.Open;
    public DateTime? SettledAt { get; set; }
    public string? Note { get; set; }

    public ICollection<CreditInstallment> Installments { get; set; } = [];

    // Conveniência de mapeamento apenas. Em query use a expressão (TotalAmount - PaidAmount):
    // propriedade [NotMapped] não é traduzível para SQL.
    [NotMapped]
    public decimal Balance => TotalAmount - PaidAmount;
}
