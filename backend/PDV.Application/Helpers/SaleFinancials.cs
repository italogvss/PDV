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
    /// Receita de um único item já líquida da parte proporcional do desconto da venda
    /// (rateado pelo peso do item no total pré-desconto da venda). Usado em rankings de
    /// produto/serviço para que a soma dos itens feche com <c>Sale.Total</c>.
    /// </summary>
    public static decimal NetItemRevenue(decimal itemSubtotal, decimal saleDiscount, decimal saleItemsTotal) =>
        saleItemsTotal > 0
            ? itemSubtotal - saleDiscount * (itemSubtotal / saleItemsTotal)
            : itemSubtotal;
}
