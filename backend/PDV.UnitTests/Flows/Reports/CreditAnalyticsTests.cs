using PDV.Application.Helpers;
using PDV.Domain.Entities;
using PDV.Domain.Enums;

namespace PDV.UnitTests.Flows.Reports;

// Fluxo: o lojista olha a carteira de fiado (na tela de Crediário ou na seção Crediário dos
// Relatórios — a conta é a mesma, CreditAnalytics). Errar aqui é cobrar quem não deve, deixar de
// cobrar quem deve, ou anunciar uma inadimplência que não existe.
[TestFixture]
public class CreditAnalyticsTests
{
    private static readonly DateTime Today = new(2026, 6, 15);

    private static CreditInstallment Open(decimal amount, int daysFromToday, decimal paid = 0m) =>
        new()
        {
            Amount = amount,
            PaidAmount = paid,
            DueDate = Today.AddDays(daysFromToday),
            Status = CreditInstallmentStatus.Open,
        };

    // Saldo é sempre o que FALTA — parcela com baixa parcial entra pelo resto, não pelo valor cheio.
    [Test]
    public void ReceivableCountsOnlyWhatIsStillMissing()
    {
        var installments = new List<CreditInstallment> { Open(100m, 10), Open(100m, 20, paid: 40m) };

        Assert.That(CreditAnalytics.TotalReceivable(installments), Is.EqualTo(160m));
    }

    // Faixa de atraso é definida pelo vencimento, não pela emissão. Uma parcela que vence hoje
    // ainda é "a vencer" — o cliente tem o dia todo para pagar.
    [Test]
    public void AgingPlacesEachBalanceInItsOverdueBand()
    {
        var installments = new List<CreditInstallment>
        {
            Open(10m, +5),   // a vencer
            Open(20m, 0),    // vence hoje → ainda a vencer
            Open(30m, -1),   // 1 dia
            Open(40m, -45),  // 31 a 60
            Open(50m, -200), // mais de 90
        };

        var buckets = CreditAnalytics.Buckets(installments, Today);

        Assert.Multiple(() =>
        {
            Assert.That(buckets[0].Amount, Is.EqualTo(30m), "A vencer");
            Assert.That(buckets[1].Amount, Is.EqualTo(30m), "1 a 30 dias");
            Assert.That(buckets[2].Amount, Is.EqualTo(40m), "31 a 60 dias");
            Assert.That(buckets[3].Amount, Is.Zero, "61 a 90 dias");
            Assert.That(buckets[4].Amount, Is.EqualTo(50m), "Mais de 90 dias");
            // Os buckets particionam a carteira: nada some, nada conta duas vezes.
            Assert.That(buckets.Sum(b => b.Amount), Is.EqualTo(150m));
        });
    }

    // Carteira vazia é 0% de inadimplência, não divisão por zero.
    [Test]
    public void DefaultRateIsZeroWhenThereIsNothingToReceive()
    {
        Assert.That(CreditAnalytics.DefaultRate(0m, 0m), Is.Zero);
    }

    [Test]
    public void DefaultRateIsOverdueOverReceivable()
    {
        Assert.That(CreditAnalytics.DefaultRate(200m, 50m), Is.EqualTo(25m));
    }

    // O ranking de devedores soma por CLIENTE (uma pessoa pode ter várias contas abertas) e informa
    // separadamente quanto do saldo dela já venceu.
    [Test]
    public void TopDebtorsAggregatePerCustomerAcrossAccounts()
    {
        var customerId = Guid.NewGuid();
        var accountA = new CreditAccount { Id = Guid.NewGuid(), CustomerId = customerId, CustomerName = "Ana" };
        var accountB = new CreditAccount { Id = Guid.NewGuid(), CustomerId = customerId, CustomerName = "Ana" };

        var installments = new List<CreditInstallment>
        {
            new() { Account = accountA, CreditAccountId = accountA.Id, Amount = 100m, DueDate = Today.AddDays(-10), Status = CreditInstallmentStatus.Open },
            new() { Account = accountB, CreditAccountId = accountB.Id, Amount = 50m, DueDate = Today.AddDays(10), Status = CreditInstallmentStatus.Open },
        };

        var debtors = CreditAnalytics.TopDebtors(installments, Today);

        Assert.That(debtors, Has.Count.EqualTo(1));
        Assert.Multiple(() =>
        {
            Assert.That(debtors[0].Balance, Is.EqualTo(150m));
            Assert.That(debtors[0].OverdueAmount, Is.EqualTo(100m));
            Assert.That(debtors[0].OpenAccounts, Is.EqualTo(2));
        });
    }
}
