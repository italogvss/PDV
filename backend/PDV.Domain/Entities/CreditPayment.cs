using PDV.Domain.Enums;

namespace PDV.Domain.Entities;

// Recebimento de uma parcela do crediário. É o registro que viabiliza a baixa parcial e o
// histórico de quem recebeu o quê e quando. Estorno é delete físico (como Expense), com o
// saldo da parcela e da conta revertidos na mesma transação.
public class CreditPayment : BaseEntity
{
    public Guid TenantId { get; set; }

    public Guid CreditAccountId { get; set; }

    public Guid CreditInstallmentId { get; set; }
    public CreditInstallment? Installment { get; set; }

    public decimal Amount { get; set; }

    // Como o dinheiro entrou (dinheiro, PIX, cartão) — reusa o enum da venda.
    public PaymentMethod Method { get; set; }

    // Taxa do método usado NESTA baixa, congelada no ato (mesmo padrão de Sale.FeeRate/FeeAmount).
    // A taxa da venda financiada não pode ser conhecida na venda: quem paga a parcela escolhe o
    // método na hora. Registros anteriores à coluna ficam em 0 — ninguém cobrou taxa deles.
    public decimal FeeRate { get; set; }
    public decimal FeeAmount { get; set; }

    public DateTime ReceivedAt { get; set; }

    public Guid? OperatorId { get; set; }
    public string OperatorName { get; set; } = string.Empty;

    public string? Note { get; set; }
}
