using PDV.Application.Helpers;

namespace PDV.UnitTests.Flows.Reports;

// Fluxo: o lojista abre os Relatórios e alterna entre Competência e Caixa. Com crediário, os dois
// regimes divergem no tempo — mas NUNCA no total. Se a soma dos pedaços de caixa deixar de fechar
// com a competência, a loja passa a ver receita que nunca existiu (ou a perder receita real).
[TestFixture]
public class RevenueRecognitionTests
{
    // Venda de R$ 1.000 com R$ 600 de custo → lucro bruto de R$ 400.
    private static SaleFinancials.SaleProfitParts WholeSale(decimal fees = 0m) =>
        SaleFinancials.Compute(
            total: 1000m, discount: 0m, itemsTotal: 1000m,
            countedSubtotal: 1000m, countedCost: 600m, fees: fees);

    // A invariante central do regime de caixa: entrada + baixas de uma venda quitada reconhecem
    // exatamente o que a competência reconheceu de uma vez na data da venda.
    [Test]
    public void CashRecognitionOfAFullyPaidSaleMatchesAccrual()
    {
        var whole = WholeSale();

        // Entrada de 200 + duas parcelas de 400 = os R$ 1.000 da venda.
        var pieces = new[] { 200m, 400m, 400m }
            .Select(received => SaleFinancials.Recognize(whole, received, 1000m))
            .ToList();

        Assert.Multiple(() =>
        {
            Assert.That(pieces.Sum(p => p.Revenue), Is.EqualTo(whole.Revenue));
            Assert.That(pieces.Sum(p => p.Cost), Is.EqualTo(whole.Cost));
            Assert.That(pieces.Sum(p => p.GrossProfit), Is.EqualTo(whole.GrossProfit));
        });
    }

    // Custo e lucro acompanham a receita na mesma proporção. Sem isso, uma venda fiado lançaria o
    // custo inteiro no mês da venda contra uma receita que entra pingada — o mês pareceria prejuízo.
    [Test]
    public void EachPieceRecognizesCostAndProfitInTheSameProportion()
    {
        var piece = SaleFinancials.Recognize(WholeSale(), received: 200m, saleTotal: 1000m);

        Assert.Multiple(() =>
        {
            Assert.That(piece.Revenue, Is.EqualTo(200m));   // 20% de 1000
            Assert.That(piece.Cost, Is.EqualTo(120m));      // 20% de 600
            Assert.That(piece.GrossProfit, Is.EqualTo(80m)); // 20% de 400
        });
    }

    // Taxa NÃO é rateada: cada uma nasce num fato gerador próprio (a da venda na venda, a da baixa
    // na baixa). Ratear a taxa da venda pelas parcelas contaria taxa duas vezes quando a baixa
    // trouxesse a sua.
    [Test]
    public void FeesAreNotProRated()
    {
        var piece = SaleFinancials.Recognize(WholeSale(fees: 30m), received: 200m, saleTotal: 1000m);

        Assert.That(piece.Fees, Is.Zero);
    }

    // Venda de total zero (100% de desconto) não pode virar divisão por zero no relatório.
    [Test]
    public void ZeroTotalSaleRecognizesEverythingAtOnce()
    {
        var whole = SaleFinancials.Compute(0m, 0m, 0m, 0m, 0m, 0m);

        var piece = SaleFinancials.Recognize(whole, received: 0m, saleTotal: 0m);

        Assert.That(piece.Revenue, Is.Zero);
    }

    // Venda à vista é o caso degenerado do modelo: um único evento de 100%, os dois regimes iguais.
    [Test]
    public void CashSaleRecognizesTheWholeSaleInOneEvent()
    {
        var whole = WholeSale();

        var piece = SaleFinancials.Recognize(whole, received: 1000m, saleTotal: 1000m);

        Assert.Multiple(() =>
        {
            Assert.That(piece.Revenue, Is.EqualTo(whole.Revenue));
            Assert.That(piece.GrossProfit, Is.EqualTo(whole.GrossProfit));
        });
    }
}
