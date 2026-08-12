namespace PDV.Domain.Enums;

// Ciclo de vida de uma conta de crediário.
// "Vencida" NÃO é status: é derivado (há parcela Open com DueDate < hoje), o que evita
// job de virada de dia e mantém o filtro puro em SQL.
public enum CreditAccountStatus
{
    Open,
    Paid,
    Cancelled,
}
