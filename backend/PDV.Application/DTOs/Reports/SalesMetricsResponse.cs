namespace PDV.Application.DTOs.Reports;

/// <param name="TotalRevenue">Receita faturada (competência) — Σ Sale.Total das vendas do período.</param>
/// <param name="ReceivedRevenue">Dinheiro que entrou por essas vendas: total das vendas à vista +
/// entrada + baixas de parcela já recebidas (mesmo que recebidas depois do período).</param>
/// <param name="OutstandingRevenue">Saldo ainda a receber das vendas do período (crediário aberto).</param>
public record SalesMetricsResponse(
    int TotalSales,
    decimal TotalRevenue,
    decimal AverageTicket,
    string Period,
    decimal ReceivedRevenue,
    decimal OutstandingRevenue);
