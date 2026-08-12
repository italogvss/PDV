namespace PDV.Application.DTOs.Reports;

/// <summary>
/// Retrato do crediário na seção Crediário dos Relatórios. Mistura de propósito dois recortes, e o
/// rótulo de cada campo deixa claro qual: <b>fatos do período</b> (faturado, recebido, perdas) e
/// <b>posição de hoje</b> (a receber, vencido, inadimplência) — saldo devedor não é um fato de
/// intervalo, é o que está de pé agora.
/// </summary>
/// <param name="Invoiced">Faturado a prazo no período: Σ (Sale.Total − entrada) das vendas fiado.</param>
/// <param name="Received">Recebido no período: entradas das vendas do período + baixas de parcela.</param>
/// <param name="Outstanding">Saldo em aberto hoje (parcelas não canceladas e não quitadas).</param>
/// <param name="Overdue">Parte do saldo em aberto já vencida.</param>
/// <param name="WrittenOff">Perdas: saldo que ficou de pé nas contas canceladas no período.</param>
/// <param name="DefaultRate">Vencido ÷ a receber, em %.</param>
public record CreditReportSummaryResponse(
    decimal Invoiced,
    decimal Received,
    decimal Outstanding,
    decimal Overdue,
    decimal WrittenOff,
    decimal DefaultRate,
    int OpenAccounts,
    int OverdueInstallments);

/// <summary>
/// Previsão de entrada por bucket: quanto vence em cada período e quanto já venceu sem ser pago.
/// Ao contrário dos demais gráficos, olha para o FUTURO — a data usada é o vencimento da parcela.
/// </summary>
public record ReceivableSchedulePoint(
    string Label,
    decimal DueAmount,
    decimal OverdueAmount,
    int InstallmentCount);
