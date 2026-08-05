using PDV.Application.DTOs.Credit;

namespace PDV.Application.DTOs.Sales;

public record SaleDetailResponse(
    Guid Id,
    Guid? OperatorId,
    string OperatorName,
    string? CustomerName,
    string? CustomerDocument,
    string PaymentMethod,
    bool IsInstallment,
    int? InstallmentCount,
    decimal? InstallmentValue,
    decimal Total,
    decimal Discount,
    string Status,
    Guid? CancelledById,
    string? CancelledByName,
    DateTime? CancelledAt,
    DateTime CreatedAt,
    List<SaleItemResponse> Items,
    decimal AmountPaid,
    decimal Change,
    decimal FeeRate,
    decimal FeeAmount,
    decimal NetAmount,
    // Situação do crediário + cronograma de parcelas, em LEITURA. Os recebimentos
    // (CreditPayment) não entram aqui: baixa e estorno são gestão de crediário.
    CreditAccountResponse? Credit,
    List<CreditInstallmentResponse> CreditInstallments);
