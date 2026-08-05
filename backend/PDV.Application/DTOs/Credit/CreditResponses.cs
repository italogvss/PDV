using PDV.Application.DTOs.Sales;

namespace PDV.Application.DTOs.Credit;

public record CreditAccountResponse(
    Guid Id,
    Guid SaleId,
    Guid CustomerId,
    string CustomerName,
    decimal TotalAmount,
    decimal DownPayment,
    decimal PaidAmount,
    decimal Balance,
    int InstallmentCount,
    int PaidInstallmentCount,
    DateTime FirstDueDate,
    DateTime? NextDueDate,
    // Derivados no Map — "vencida" nunca é status persistido.
    bool IsOverdue,
    int OverdueInstallmentCount,
    decimal OverdueAmount,
    string Status,
    DateTime? SettledAt,
    string? Note,
    DateTime CreatedAt);

public record CreditInstallmentResponse(
    Guid Id,
    Guid CreditAccountId,
    Guid CustomerId,
    string CustomerName,
    int Number,
    int OfTotal,
    DateTime DueDate,
    decimal Amount,
    decimal PaidAmount,
    decimal Balance,
    DateTime? PaidAt,
    string Status,
    bool IsOverdue,
    int DaysOverdue);

public record CreditPaymentResponse(
    Guid Id,
    Guid CreditAccountId,
    Guid CreditInstallmentId,
    int InstallmentNumber,
    decimal Amount,
    string Method,
    DateTime ReceivedAt,
    string OperatorName,
    string? Note);

// Detalhe da conta: inclui a VENDA que a originou (com itens), as parcelas e o histórico
// de recebimentos — é o que alimenta o modal de detalhes da tela.
public record CreditAccountDetailResponse(
    CreditAccountResponse Account,
    SaleDetailResponse? Sale,
    List<CreditInstallmentResponse> Installments,
    List<CreditPaymentResponse> Payments);

public record CreditSummaryResponse(
    decimal TotalReceivable,
    decimal OverdueAmount,
    decimal ReceivedThisMonth,
    int CustomersWithBalance,
    int OpenAccounts,
    int OverdueInstallments);

public record CreditAgingBucket(
    string Label,
    decimal Amount,
    int InstallmentCount);

public record CreditTopDebtor(
    Guid CustomerId,
    string CustomerName,
    decimal Balance,
    decimal OverdueAmount,
    int OpenAccounts);

public record CreditAgingResponse(
    List<CreditAgingBucket> Buckets,
    List<CreditTopDebtor> TopDebtors,
    decimal TotalReceivable,
    decimal OverdueAmount,
    // Percentual do saldo a receber que está vencido.
    decimal DefaultRate);

// Texto pronto de cobrança (feature Pro). O frontend usa para montar o link do WhatsApp.
public record CreditReminderResponse(
    Guid InstallmentId,
    string CustomerName,
    string? CustomerPhone,
    decimal Amount,
    DateTime DueDate,
    int DaysOverdue,
    string Message);
