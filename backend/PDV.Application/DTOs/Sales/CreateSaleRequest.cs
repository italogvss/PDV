namespace PDV.Application.DTOs.Sales;

public record CreateSaleRequest(
    Guid? CustomerId,
    string? CustomerDocument,
    string PaymentMethod,
    bool IsInstallment,
    int? InstallmentCount,
    decimal AmountPaid,
    List<CreateSaleItemRequest> Items,
    decimal Discount = 0,
    CreateSaleCreditRequest? Credit = null);

public record CreateSaleItemRequest(Guid? ProductId, Guid? ServiceId, int Quantity);

// Presente = a venda é fiado. O crediário nasce dentro da MESMA transação da venda (ver
// docs/crediario.md §6), então `PaymentMethod` e `AmountPaid` passam a descrever só a ENTRADA:
// é sobre ela que a taxa da venda é recalculada, o resto entra na baixa de cada parcela.
public record CreateSaleCreditRequest(
    int InstallmentCount,
    DateTime FirstDueDate,
    decimal DownPayment = 0,
    string? Note = null);
