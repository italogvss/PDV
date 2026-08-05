using PDV.Application.DTOs.Credit;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Credit;

// Fluxo: o cliente aparece na loja e paga (tudo ou um pedaço) de uma parcela do fiado.
// É dinheiro entrando: saldo errado aqui significa cobrar duas vezes ou dar quitação de graça.
[TestFixture]
public class ReceivePaymentTests
{
    private static ReceiveInstallmentRequest Receipt(decimal amount) =>
        new(amount, nameof(PaymentMethod.Cash), DateTime.UtcNow.Date, null);

    // Baixa parcial NÃO quita: a parcela continua Open com saldo. Se isto regredir, um cliente
    // que pagou R$ 10 de uma parcela de R$ 100 sai do sistema como quitado.
    [Test]
    public async Task PartialPaymentLeavesTheInstallmentOpenWithBalance()
    {
        var harness = new CreditHarness();
        var account = harness.GivenAccount(300m, 3, DateTime.UtcNow.Date);
        var first = account.Installments.First();

        await harness.Build().ReceiveAsync(first.Id, Receipt(40m));

        Assert.Multiple(() =>
        {
            Assert.That(harness.SavedInstallment!.PaidAmount, Is.EqualTo(40m));
            Assert.That(harness.SavedInstallment.Status, Is.EqualTo(CreditInstallmentStatus.Open));
            Assert.That(harness.SavedInstallment.PaidAt, Is.Null);
            Assert.That(harness.SavedAccount!.PaidAmount, Is.EqualTo(40m));
            Assert.That(harness.SavedAccount.Status, Is.EqualTo(CreditAccountStatus.Open));
        });
    }

    // Várias baixas parciais somam até quitar. É o caso real do balcão: "hoje pago metade".
    [Test]
    public async Task SuccessivePartialPaymentsSettleTheInstallment()
    {
        var harness = new CreditHarness();
        var account = harness.GivenAccount(300m, 3, DateTime.UtcNow.Date);
        var first = account.Installments.First();
        var service = harness.Build();

        await service.ReceiveAsync(first.Id, Receipt(60m));
        await service.ReceiveAsync(first.Id, Receipt(40m));

        Assert.Multiple(() =>
        {
            Assert.That(harness.SavedInstallment!.PaidAmount, Is.EqualTo(100m));
            Assert.That(harness.SavedInstallment.Status, Is.EqualTo(CreditInstallmentStatus.Paid));
            Assert.That(harness.SavedInstallment.PaidAt, Is.Not.Null);
        });
    }

    // Quitar a última parcela quita a CONTA. O status da conta é o que a listagem mostra —
    // se não virar, o lojista continua cobrando quem já pagou tudo.
    [Test]
    public async Task PayingTheLastInstallmentSettlesTheWholeAccount()
    {
        var harness = new CreditHarness();
        var account = harness.GivenAccount(300m, 3, DateTime.UtcNow.Date);
        var service = harness.Build();

        foreach (var installment in account.Installments.OrderBy(i => i.Number))
            await service.ReceiveAsync(installment.Id, Receipt(installment.Amount));

        Assert.Multiple(() =>
        {
            Assert.That(harness.SavedAccount!.PaidAmount, Is.EqualTo(300m));
            Assert.That(harness.SavedAccount.Status, Is.EqualTo(CreditAccountStatus.Paid));
            Assert.That(harness.SavedAccount.SettledAt, Is.Not.Null);
        });
    }

    // Receber mais que o saldo da parcela é recusado — senão o saldo da conta vira negativo
    // e o "total a receber" da loja fica errado.
    [Test]
    public void PaymentAboveTheInstallmentBalanceIsRejected()
    {
        var harness = new CreditHarness();
        var account = harness.GivenAccount(300m, 3, DateTime.UtcNow.Date);
        var first = account.Installments.First();

        Assert.ThrowsAsync<BusinessException>(
            () => harness.Build().ReceiveAsync(first.Id, Receipt(first.Amount + 0.01m)));
    }

    [Test]
    public void PaymentOnAnAlreadyPaidInstallmentIsRejected()
    {
        var harness = new CreditHarness();
        var account = harness.GivenAccount(300m, 3, DateTime.UtcNow.Date);
        var first = account.Installments.First();
        first.PaidAmount = first.Amount;
        first.Status = CreditInstallmentStatus.Paid;

        Assert.ThrowsAsync<BusinessException>(
            () => harness.Build().ReceiveAsync(first.Id, Receipt(10m)));
    }

    [Test]
    public void PaymentOnACancelledAccountIsRejected()
    {
        var harness = new CreditHarness();
        var account = harness.GivenAccount(300m, 3, DateTime.UtcNow.Date);
        account.Status = CreditAccountStatus.Cancelled;

        Assert.ThrowsAsync<BusinessException>(
            () => harness.Build().ReceiveAsync(account.Installments.First().Id, Receipt(10m)));
    }

    // Data futura é recusada: um recebimento lançado "amanhã" sumiria do fechamento de hoje
    // e reapareceria depois, bagunçando a conferência de caixa.
    [Test]
    public void FutureDatedPaymentIsRejected()
    {
        var harness = new CreditHarness();
        var account = harness.GivenAccount(300m, 3, DateTime.UtcNow.Date);

        var request = new ReceiveInstallmentRequest(
            50m, nameof(PaymentMethod.Cash), DateTime.UtcNow.Date.AddDays(1), null);

        Assert.ThrowsAsync<BusinessException>(
            () => harness.Build().ReceiveAsync(account.Installments.First().Id, request));
    }

    [Test]
    public void ZeroOrNegativeAmountIsRejectedByTheValidator()
    {
        var harness = new CreditHarness();
        var account = harness.GivenAccount(300m, 3, DateTime.UtcNow.Date);

        Assert.ThrowsAsync<FluentValidation.ValidationException>(
            () => harness.Build().ReceiveAsync(account.Installments.First().Id, Receipt(0m)));
    }
}
