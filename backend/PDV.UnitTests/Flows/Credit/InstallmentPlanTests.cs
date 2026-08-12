using PDV.Application.Helpers;

namespace PDV.UnitTests.Flows.Credit;

// Fluxo: o lojista vende fiado e o sistema divide o valor em parcelas.
// A invariante é aritmética e vale dinheiro: se a soma das parcelas não bater com o valor
// financiado, o cliente fica devendo (ou sendo cobrado) centavos fantasma para sempre.
[TestFixture]
public class InstallmentPlanTests
{
    [TestCase(100.00, 3)]
    [TestCase(99.99, 7)]
    [TestCase(1327.79, 6)]
    [TestCase(0.03, 2)]
    [TestCase(10.00, 12)]
    [TestCase(250.00, 1)]
    public void SumOfInstallmentsAlwaysEqualsTheFinancedAmount(decimal total, int count)
    {
        var plan = CreditInstallmentPlanner.Build(total, count, new DateTime(2026, 1, 10));

        Assert.Multiple(() =>
        {
            Assert.That(plan.Sum(p => p.Amount), Is.EqualTo(total));
            Assert.That(plan, Has.Count.EqualTo(count));
        });
    }

    // O resíduo do arredondamento vai na PRIMEIRA parcela (padrão do varejo brasileiro: a
    // diferença é cobrada logo, não empurrada para o fim).
    [Test]
    public void RoundingRemainderGoesToTheFirstInstallment()
    {
        var plan = CreditInstallmentPlanner.Build(100.00m, 3, new DateTime(2026, 1, 10));

        Assert.Multiple(() =>
        {
            Assert.That(plan[0].Amount, Is.EqualTo(33.34m));
            Assert.That(plan[1].Amount, Is.EqualTo(33.33m));
            Assert.That(plan[2].Amount, Is.EqualTo(33.33m));
        });
    }

    // Vencimentos são mensais a partir da primeira data, sem componente de hora.
    [Test]
    public void DueDatesAreMonthlyFromTheFirstDueDate()
    {
        var plan = CreditInstallmentPlanner.Build(300m, 3, new DateTime(2026, 1, 10, 15, 42, 0));

        Assert.Multiple(() =>
        {
            Assert.That(plan[0].DueDate, Is.EqualTo(new DateTime(2026, 1, 10)));
            Assert.That(plan[1].DueDate, Is.EqualTo(new DateTime(2026, 2, 10)));
            Assert.That(plan[2].DueDate, Is.EqualTo(new DateTime(2026, 3, 10)));
        });
    }

    // AddMonths satura no último dia do mês — 31/01 + 1 mês = 28/02, não 03/03.
    // Sem isso, a parcela "pularia" para o mês seguinte e a ordem de vencimento embaralharia.
    [Test]
    public void DueDatesClampToTheLastDayOfShorterMonths()
    {
        var plan = CreditInstallmentPlanner.Build(300m, 3, new DateTime(2026, 1, 31));

        Assert.Multiple(() =>
        {
            Assert.That(plan[1].DueDate, Is.EqualTo(new DateTime(2026, 2, 28)));
            Assert.That(plan[2].DueDate, Is.EqualTo(new DateTime(2026, 3, 31)));
        });
    }

    [Test]
    public void ZeroInstallmentsIsRejected()
    {
        Assert.Throws<ArgumentOutOfRangeException>(
            () => CreditInstallmentPlanner.Build(100m, 0, DateTime.UtcNow));
    }
}
