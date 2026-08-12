namespace PDV.Application.DTOs.Reports;

/// <param name="TotalRevenue">Σ Sale.Total do cliente no período (faturado, não recebido).</param>
/// <param name="Outstanding">Saldo de crediário do cliente ainda em aberto — hoje, não do período:
/// é dívida viva, não um fato do intervalo consultado.</param>
public record TopCustomerResponse(
    Guid CustomerId,
    string Name,
    int PurchaseCount,
    decimal TotalRevenue,
    decimal Outstanding);
