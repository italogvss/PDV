using PDV.Application.DTOs.Credit;

namespace PDV.Application.DTOs.Sales;

public record SaleResponse(
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
    // Crediário da venda, quando houver — o histórico é quem gerencia a venda e precisa
    // mostrar que ela é fiado. Null = venda à vista. Reusa o DTO do módulo de crediário
    // para não duplicar a regra de saldo/vencimento.
    CreditAccountResponse? Credit);
