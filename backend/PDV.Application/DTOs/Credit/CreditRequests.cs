namespace PDV.Application.DTOs.Credit;

// Cria a conta de crediário de uma venda existente. É o mesmo contrato que o fluxo de venda
// vai usar quando o PDV for reformulado (SaleService chama CreateForSaleAsync direto).
public record CreateCreditAccountRequest(
    Guid SaleId,
    int InstallmentCount,
    DateTime FirstDueDate,
    decimal DownPayment = 0,
    string? Note = null);

// Baixa (total ou parcial) de uma parcela.
public record ReceiveInstallmentRequest(
    decimal Amount,
    string Method,
    DateTime ReceivedAt,
    string? Note = null);
