namespace PDV.Domain.Enums;

// Ciclo de vida de uma parcela. Pagamento parcial mantém a parcela em Open com PaidAmount > 0;
// só vira Paid quando o saldo zera. "Vencida" é derivado (Open && DueDate < hoje).
public enum CreditInstallmentStatus
{
    Open,
    Paid,
    Cancelled,
}
