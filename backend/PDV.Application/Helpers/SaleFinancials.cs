namespace PDV.Application.Helpers;

/// <summary>
/// Fonte única da matemática de lucro de uma venda. Centraliza a definição usada em toda a
/// aplicação (relatórios, exportação de faturamento, dashboard) para que nenhum lugar reinvente
/// a fórmula — foi a divergência entre cópias que gerou lucro superestimado.
///
/// Regras canônicas:
/// - <b>Receita</b> = <c>Sale.Total</c> (pós-desconto), a mesma base do KPI "Receita total".
/// - <b>Itens contáveis</b> = serviços (custo zero legítimo) + produtos com custo cadastrado.
///   Produtos sem <c>PurchasePriceSnapshot</c> são ignorados no lucro, para não inflar a margem
///   com custo zero (a receita deles continua em <c>Sale.Total</c>).
/// - <b>Desconto</b> da venda é rateado proporcionalmente entre os itens contáveis, na mesma
///   proporção usada no ranking de produtos (peso do item no total da venda).
///
/// <para><b>Competência × caixa (crediário).</b> <see cref="Compute"/> é a visão de
/// <i>competência</i>: a venda inteira reconhecida na data da venda. Com fiado o dinheiro entra
/// depois, então a visão de <i>caixa</i> se obtém aplicando <see cref="Recognize"/> a cada evento
/// de entrada de dinheiro (entrada do crediário na data da venda, cada baixa na data do
/// recebimento). Venda à vista tem um evento só, de 100% — os dois regimes coincidem.</para>
/// </summary>
public static class SaleFinancials
{
    /// <summary>Parcelas financeiras de uma venda, prontas para agregar por período.</summary>
    public readonly record struct SaleProfitParts(
        decimal Revenue,
        decimal Cost,
        decimal Fees,
        decimal GrossProfit);

    /// <summary>
    /// Calcula as parcelas de lucro de uma venda a partir dos totais já somados no banco.
    /// </summary>
    /// <param name="total">Total da venda (pós-desconto) — <c>Sale.Total</c>.</param>
    /// <param name="discount">Desconto no nível da venda — <c>Sale.Discount</c>.</param>
    /// <param name="itemsTotal">Soma dos subtotais de TODOS os itens (pré-desconto).</param>
    /// <param name="countedSubtotal">Soma dos subtotais apenas dos itens contáveis (pré-desconto).</param>
    /// <param name="countedCost">Custo (PurchasePriceSnapshot × Qty) dos itens contáveis.</param>
    /// <param name="fees">Taxa da forma de pagamento — <c>Sale.FeeAmount</c>.</param>
    public static SaleProfitParts Compute(
        decimal total,
        decimal discount,
        decimal itemsTotal,
        decimal countedSubtotal,
        decimal countedCost,
        decimal fees)
    {
        // Receita dos itens contáveis já líquida do desconto rateado pelo peso no total da venda.
        var countedRevenue = itemsTotal > 0
            ? countedSubtotal - discount * (countedSubtotal / itemsTotal)
            : countedSubtotal;

        var grossProfit = countedRevenue - countedCost;
        return new SaleProfitParts(total, countedCost, fees, grossProfit);
    }

    /// <summary>
    /// Reconhece a fatia de uma venda correspondente ao valor efetivamente <b>recebido</b> — é a
    /// ponte entre o regime de competência e o de caixa, e o único lugar do sistema que faz esse
    /// rateio. Uma venda em crediário entra no caixa em pedaços (entrada + cada baixa de parcela);
    /// cada pedaço reconhece a mesma proporção de receita, custo e lucro bruto, de modo que a soma
    /// de todos os pedaços de uma venda quitada fecha <b>exatamente</b> com a competência.
    ///
    /// <para><b>Taxas não são rateadas</b> — cada taxa entra na data do seu próprio fato gerador
    /// (<c>Sale.FeeAmount</c> na venda, <c>CreditPayment.FeeAmount</c> na baixa), então
    /// <c>Fees</c> volta zerado aqui e é somado à parte pelo chamador.</para>
    /// </summary>
    /// <param name="parts">Parcelas da venda inteira, vindas de <see cref="Compute"/>.</param>
    /// <param name="received">Valor recebido neste evento de caixa.</param>
    /// <param name="saleTotal">Total da venda — <c>Sale.Total</c>. Zero reconhece 100%.</param>
    public static SaleProfitParts Recognize(SaleProfitParts parts, decimal received, decimal saleTotal)
    {
        var ratio = saleTotal > 0 ? received / saleTotal : 1m;
        return new SaleProfitParts(
            parts.Revenue * ratio,
            parts.Cost * ratio,
            Fees: 0m,
            parts.GrossProfit * ratio);
    }

    /// <summary>
    /// Receita de um único item já líquida da parte proporcional do desconto da venda
    /// (rateado pelo peso do item no total pré-desconto da venda). Usado em rankings de
    /// produto/serviço para que a soma dos itens feche com <c>Sale.Total</c>.
    /// </summary>
    public static decimal NetItemRevenue(decimal itemSubtotal, decimal saleDiscount, decimal saleItemsTotal) =>
        saleItemsTotal > 0
            ? itemSubtotal - saleDiscount * (itemSubtotal / saleItemsTotal)
            : itemSubtotal;
}
