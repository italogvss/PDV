using Moq;
using PDV.Application.DTOs.Credit;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Credit;

// Fluxo: abrir o crediário de uma venda, estornar um recebimento lançado errado e cancelar
// uma conta. São as três operações que mexem no saldo devedor fora da baixa normal.
[TestFixture]
public class OpenAndCloseAccountTests
{
    // A conta nasce SEMPRE de uma venda e o valor financiado é o total da venda menos a entrada.
    [Test]
    public async Task OpeningFinancesTheSaleTotalMinusTheDownPayment()
    {
        var harness = new CreditHarness();
        var sale = harness.GivenSale(500m);

        await harness.Build().CreateForSaleAsync(
            new CreateCreditAccountRequest(sale.Id, 4, DateTime.UtcNow.Date, 100m));

        Assert.Multiple(() =>
        {
            Assert.That(harness.AddedAccount!.TotalAmount, Is.EqualTo(400m));
            Assert.That(harness.AddedAccount.DownPayment, Is.EqualTo(100m));
            Assert.That(harness.AddedAccount.Installments, Has.Count.EqualTo(4));
            Assert.That(harness.AddedAccount.Installments.Sum(i => i.Amount), Is.EqualTo(400m));
            Assert.That(harness.AddedAccount.Status, Is.EqualTo(CreditAccountStatus.Open));
        });
    }

    // A venda foi fechada como se fosse à vista, com taxa do método sobre o total. Virando fiado,
    // só a ENTRADA passou pela maquininha — o resto será capturado nas baixas, com o método que o
    // cliente escolher lá. Sem este recálculo, o relatório debita taxa de cartão sobre dinheiro que
    // ninguém passou no cartão, e o lucro líquido sai menor do que é.
    [Test]
    public async Task OpeningRecalculatesTheSaleFeeOverTheDownPaymentOnly()
    {
        var harness = new CreditHarness();
        var sale = harness.GivenSale(500m, feeRate: 3m); // fechada com taxa de 3% → R$ 15,00

        await harness.Build().CreateForSaleAsync(
            new CreateCreditAccountRequest(sale.Id, 4, DateTime.UtcNow.Date, 100m));

        Assert.Multiple(() =>
        {
            // 3% de 100 (entrada), não 3% de 500.
            Assert.That(harness.AddedAccountSale!.FeeAmount, Is.EqualTo(3m));
            Assert.That(harness.AddedAccountSale.NetAmount, Is.EqualTo(497m));
            // A alíquota da venda continua sendo a do método escolhido — muda a base, não a taxa.
            Assert.That(harness.AddedAccountSale.FeeRate, Is.EqualTo(3m));
        });
    }

    // Sem entrada, a venda não capturou nada: taxa zero.
    [Test]
    public async Task OpeningWithoutDownPaymentZeroesTheSaleFee()
    {
        var harness = new CreditHarness();
        var sale = harness.GivenSale(500m, feeRate: 3m);

        await harness.Build().CreateForSaleAsync(
            new CreateCreditAccountRequest(sale.Id, 4, DateTime.UtcNow.Date));

        Assert.Multiple(() =>
        {
            Assert.That(harness.AddedAccountSale!.FeeAmount, Is.Zero);
            Assert.That(harness.AddedAccountSale.NetAmount, Is.EqualTo(500m));
        });
    }

    // Fiado exige cliente identificado: sem saber de quem cobrar, a conta não pode existir.
    [Test]
    public void SaleWithoutACustomerCannotBecomeCredit()
    {
        var harness = new CreditHarness();
        var sale = harness.GivenSale(500m);
        sale.CustomerId = null;

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CreateForSaleAsync(
            new CreateCreditAccountRequest(sale.Id, 3, DateTime.UtcNow.Date)));
    }

    [Test]
    public void CancelledSaleCannotBecomeCredit()
    {
        var harness = new CreditHarness();
        var sale = harness.GivenSale(500m, status: SaleStatus.Cancelled);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CreateForSaleAsync(
            new CreateCreditAccountRequest(sale.Id, 3, DateTime.UtcNow.Date)));
    }

    // Uma venda tem no máximo um crediário — abrir de novo duplicaria a dívida do cliente.
    [Test]
    public void SaleThatAlreadyHasCreditIsRejected()
    {
        var harness = new CreditHarness();
        var sale = harness.GivenSale(500m);
        var existing = harness.GivenAccount(500m, 3, DateTime.UtcNow.Date);
        harness.Repository.Setup(r => r.GetAccountBySaleIdAsync(sale.Id)).ReturnsAsync(existing);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CreateForSaleAsync(
            new CreateCreditAccountRequest(sale.Id, 3, DateTime.UtcNow.Date)));
    }

    // Entrada >= total não deixa nada para financiar — seria uma conta de saldo zero ou negativo.
    [Test]
    public void DownPaymentCoveringTheWholeSaleIsRejected()
    {
        var harness = new CreditHarness();
        var sale = harness.GivenSale(500m);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CreateForSaleAsync(
            new CreateCreditAccountRequest(sale.Id, 3, DateTime.UtcNow.Date, 500m)));
    }

    // Vencimento anterior à venda faria o carnê nascer vencido, indo direto para o aging, a
    // inadimplência e os lembretes. O DatePicker do PDV barra; POST /credit/accounts não passa
    // por ele. Um mês atrás está fora da folga de um dia dada ao fuso.
    [Test]
    public void FirstDueDateBeforeTheSaleIsRejected()
    {
        var harness = new CreditHarness();
        var sale = harness.GivenSale(500m);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CreateForSaleAsync(
            new CreateCreditAccountRequest(sale.Id, 3, DateTime.UtcNow.Date.AddMonths(-1))));
    }

    // A política da loja (TenantSettings) vale aqui, e não só no PDV: quem chamar a API direto
    // com 24 parcelas numa loja que aceita 6 tem que ser barrado igual.
    [Test]
    public void InstallmentCountAboveTheStorePolicyIsRejected()
    {
        var harness = new CreditHarness();
        harness.GivenCreditPolicy(maxInstallments: 6);
        var sale = harness.GivenSale(500m);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CreateForSaleAsync(
            new CreateCreditAccountRequest(sale.Id, 12, DateTime.UtcNow.Date)));
    }

    [Test]
    public async Task InstallmentCountAtTheStorePolicyLimitIsAccepted()
    {
        var harness = new CreditHarness();
        harness.GivenCreditPolicy(maxInstallments: 6);
        var sale = harness.GivenSale(500m);

        await harness.Build().CreateForSaleAsync(
            new CreateCreditAccountRequest(sale.Id, 6, DateTime.UtcNow.Date));

        Assert.That(harness.AddedAccount!.Installments, Has.Count.EqualTo(6));
    }

    // Entrada mínima é sobre o TOTAL da venda, não sobre o financiado.
    [Test]
    public void DownPaymentBelowTheStoreMinimumIsRejected()
    {
        var harness = new CreditHarness();
        harness.GivenCreditPolicy(minDownPaymentPercent: 20m);
        var sale = harness.GivenSale(500m); // mínimo = R$ 100,00

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CreateForSaleAsync(
            new CreateCreditAccountRequest(sale.Id, 3, DateTime.UtcNow.Date, 99m)));
    }

    [Test]
    public async Task DownPaymentAtTheStoreMinimumIsAccepted()
    {
        var harness = new CreditHarness();
        harness.GivenCreditPolicy(minDownPaymentPercent: 20m);
        var sale = harness.GivenSale(500m);

        await harness.Build().CreateForSaleAsync(
            new CreateCreditAccountRequest(sale.Id, 3, DateTime.UtcNow.Date, 100m));

        Assert.That(harness.AddedAccount!.TotalAmount, Is.EqualTo(400m));
    }

    // Estorno devolve o valor ao saldo devedor e REABRE a parcela/conta que tinham quitado.
    // Se só apagasse o recebimento sem reverter os status, o cliente ficaria quitado devendo.
    [Test]
    public async Task ReversalRestoresTheBalanceAndReopensTheInstallment()
    {
        var harness = new CreditHarness();
        var account = harness.GivenAccount(300m, 3, DateTime.UtcNow.Date);
        var first = account.Installments.First();

        first.PaidAmount = first.Amount;
        first.Status = CreditInstallmentStatus.Paid;
        first.PaidAt = DateTime.UtcNow;
        account.PaidAmount = first.Amount;

        var payment = harness.GivenPayment(account, first, first.Amount);

        await harness.Build().ReverseAsync(payment.Id);

        Assert.Multiple(() =>
        {
            Assert.That(harness.ReversalSaved, Is.True);
            Assert.That(harness.SavedInstallment!.PaidAmount, Is.EqualTo(0m));
            Assert.That(harness.SavedInstallment.Status, Is.EqualTo(CreditInstallmentStatus.Open));
            Assert.That(harness.SavedInstallment.PaidAt, Is.Null);
            Assert.That(harness.SavedAccount!.PaidAmount, Is.EqualTo(0m));
            Assert.That(harness.SavedAccount.Status, Is.EqualTo(CreditAccountStatus.Open));
            Assert.That(harness.SavedAccount.SettledAt, Is.Null);
        });
    }

    // Cancelar encerra a cobrança do que resta, mas NÃO devolve dinheiro: os recebimentos
    // já feitos continuam contando no faturamento da loja.
    [Test]
    public async Task CancellingClosesOpenInstallmentsAndKeepsWhatWasAlreadyReceived()
    {
        var harness = new CreditHarness();
        var account = harness.GivenAccount(300m, 3, DateTime.UtcNow.Date);
        var first = account.Installments.First();
        first.PaidAmount = first.Amount;
        first.Status = CreditInstallmentStatus.Paid;
        account.PaidAmount = first.Amount;

        await harness.Build().CancelAccountAsync(account.Id);

        Assert.Multiple(() =>
        {
            Assert.That(account.Status, Is.EqualTo(CreditAccountStatus.Cancelled));
            Assert.That(account.PaidAmount, Is.EqualTo(first.Amount));
            Assert.That(
                account.Installments.Where(i => i.Number > 1).Select(i => i.Status),
                Is.All.EqualTo(CreditInstallmentStatus.Cancelled));
            // A parcela já quitada permanece quitada — cancelar não apaga histórico de dinheiro.
            Assert.That(first.Status, Is.EqualTo(CreditInstallmentStatus.Paid));
        });
    }

    // Cancelar precisa CARIMBAR a data: é ela que joga a perda no mês certo do relatório.
    // UpdatedAt não serve — muda a cada alteração da conta.
    [Test]
    public async Task CancellingStampsTheCancellationDate()
    {
        var harness = new CreditHarness();
        var account = harness.GivenAccount(300m, 3, DateTime.UtcNow.Date);

        await harness.Build().CancelAccountAsync(account.Id);

        Assert.That(account.CancelledAt, Is.EqualTo(DateTime.UtcNow).Within(TimeSpan.FromMinutes(1)));
    }

    // Conta cancelada não tem cobrança viva: estornar ali mexeria no saldo de algo já baixado como
    // perda, sem reabrir parcela nenhuma — o "a receber" e as "perdas" divergiriam.
    [Test]
    public void ReversalOnACancelledAccountIsRejected()
    {
        var harness = new CreditHarness();
        var account = harness.GivenAccount(300m, 3, DateTime.UtcNow.Date);
        var first = account.Installments.First();
        var payment = harness.GivenPayment(account, first, 50m);
        account.Status = CreditAccountStatus.Cancelled;

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().ReverseAsync(payment.Id));
    }

    [Test]
    public void CancellingTwiceIsRejected()
    {
        var harness = new CreditHarness();
        var account = harness.GivenAccount(300m, 3, DateTime.UtcNow.Date);
        account.Status = CreditAccountStatus.Cancelled;

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CancelAccountAsync(account.Id));
    }
}
