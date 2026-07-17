using Moq;
using PDV.Application.DTOs.Account;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.AccountDeletion;

// Fluxo: o Owner pede o encerramento da conta (docs/account-deletion.md §9.1, matriz A1–A7).
// Este é o ponto de decisão do pipeline destrutivo: define SE o pedido entra, QUANDO a carência
// começa e O QUE acontece com a assinatura. Um erro aqui apaga dados de quem não pediu, ou deixa de
// devolver dinheiro a quem tinha direito.
[TestFixture]
public class RequestAccountDeletionTests
{
    private static readonly RequestAccountDeletionRequest DeleteNow = new(AccountDeletionPath.DeleteNow);
    private static readonly RequestAccountDeletionRequest AtPeriodEnd = new(AccountDeletionPath.AtPeriodEnd);

    // ── A1: pedir sem assinatura ────────────────────────────────────────────────────────────

    [Test]
    public async Task A1_RequestWithoutSubscription_StartsGraceNowAndSchedulesDeletionIn30Days()
    {
        var harness = new AccountDeletionHarness().WithSubscription(null);

        var result = await harness.Build().RequestAsync(DeleteNow);

        Assert.Multiple(() =>
        {
            Assert.That(result.EffectiveAt, Is.EqualTo(DateTime.UtcNow).Within(TimeSpan.FromSeconds(5)),
                "Sem assinatura, a carência começa na hora.");
            Assert.That(result.ScheduledDeletionAt,
                Is.EqualTo(result.EffectiveAt.AddDays(RetentionDefaults.DeletionGraceDays))
                  .Within(TimeSpan.FromSeconds(1)));
            Assert.That(result.SubscriptionCanceled, Is.False, "Não havia o que cancelar.");
            Assert.That(result.RefundRequested, Is.False);
        });
    }

    [Test]
    public async Task A1_RequestWithoutSubscription_NeverCallsTheGateway()
    {
        var harness = new AccountDeletionHarness().WithSubscription(null);

        await harness.Build().RequestAsync(DeleteNow);

        harness.SubscriptionService.Verify(s => s.CancelAsync(), Times.Never);
    }

    [Test]
    public async Task A1_Request_WritesLedgerAsRequestedWithAccountScope()
    {
        var harness = new AccountDeletionHarness().WithSubscription(null);

        await harness.Build().RequestAsync(DeleteNow);

        var ledger = harness.SavedLedger;
        Assert.Multiple(() =>
        {
            Assert.That(ledger, Is.Not.Null, "O ledger é a prova de conformidade — não é opcional.");
            Assert.That(ledger!.Status, Is.EqualTo(AccountDeletionStatus.Requested));
            Assert.That(ledger.Scope, Is.EqualTo(AccountDeletionScope.Account));
            Assert.That(ledger.Path, Is.EqualTo(AccountDeletionPath.DeleteNow));
            Assert.That(ledger.UserId, Is.EqualTo(harness.User.Id));
        });
    }

    // Todas as lojas do Owner entram no agendamento — o encerramento é da CONTA, não de uma loja.
    [Test]
    public async Task A1_Request_SchedulesDeletionForAllOwnerStores()
    {
        var harness = new AccountDeletionHarness().WithSubscription(null);

        var result = await harness.Build().RequestAsync(DeleteNow);

        harness.Retention.Verify(
            r => r.ScheduleAccountDeletionForOwnerAsync(harness.User.Id, result.ScheduledDeletionAt),
            Times.Once);
    }

    // Ordem crítica (comentário no código): as flags do User têm de ser gravadas ANTES de agendar as
    // lojas. O reconciliador horário pula owners com AccountDeletionRequestedAt; invertida a ordem,
    // ele poderia recalcular por cima do prazo explícito e limpar o agendamento.
    [Test]
    public async Task A1_Request_MarksUserBeforeSchedulingStores()
    {
        var harness = new AccountDeletionHarness().WithSubscription(null);
        var sequence = new List<string>();

        harness.Users.Setup(r => r.UpdateAsync(It.IsAny<User>()))
               .Callback(() => sequence.Add("mark-user"))
               .Returns(Task.CompletedTask);
        harness.Retention.Setup(r => r.ScheduleAccountDeletionForOwnerAsync(It.IsAny<Guid>(), It.IsAny<DateTime>()))
               .Callback(() => sequence.Add("schedule-stores"))
               .ReturnsAsync(1);

        await harness.Build().RequestAsync(DeleteNow);

        Assert.That(sequence, Is.EqualTo(new[] { "mark-user", "schedule-stores" }),
            "O discriminador do User precisa existir antes do agendamento das lojas.");
    }

    [Test]
    public async Task A1_Request_SetsTheDeletionFlagsOnTheUser()
    {
        var harness = new AccountDeletionHarness().WithSubscription(null);

        var result = await harness.Build().RequestAsync(DeleteNow);

        Assert.Multiple(() =>
        {
            Assert.That(harness.User.AccountDeletionRequestedAt, Is.Not.Null);
            Assert.That(harness.User.AccountDeletionEffectiveAt, Is.EqualTo(result.EffectiveAt));
        });
    }

    // ── A2: assinatura ativa fora da janela, Path B (agendar p/ o fim do plano) ─────────────

    // O usuário pagou pelo período; encerrar não pode confiscar o que resta. A carência só começa
    // quando o acesso acabar.
    [Test]
    public async Task A2_ActiveOutsideRefundWindow_PathB_StartsGraceAtPeriodEnd()
    {
        var periodEnd = DateTime.UtcNow.AddDays(20);
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 40).WithPeriodEnd(periodEnd).Build();
        var harness = new AccountDeletionHarness()
            .WithSubscription(sub)
            .WhenCancelledReturns("Canceled", refundRequested: false, accessUntil: periodEnd);

        var result = await harness.Build().RequestAsync(AtPeriodEnd);

        Assert.Multiple(() =>
        {
            Assert.That(result.EffectiveAt, Is.EqualTo(periodEnd),
                "A carência começa quando o acesso pago termina.");
            Assert.That(result.ScheduledDeletionAt,
                Is.EqualTo(periodEnd.AddDays(RetentionDefaults.DeletionGraceDays)));
            Assert.That(result.SubscriptionCanceled, Is.True);
            Assert.That(result.RefundRequested, Is.False, "Fora da janela não há o que estornar.");
        });
    }

    // ── A3: pedir dentro da janela de 7 dias ────────────────────────────────────────────────

    // Direito de arrependimento: o dinheiro volta e o acesso cai na hora.
    [Test]
    public async Task A3_ActiveWithinRefundWindow_IssuesRefundAndStartsGraceNow()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 3).Build();
        var harness = new AccountDeletionHarness()
            .WithSubscription(sub)
            .WhenCancelledReturns("RefundRequested", refundRequested: true, accessUntil: null);

        var result = await harness.Build().RequestAsync(DeleteNow);

        Assert.Multiple(() =>
        {
            Assert.That(result.RefundRequested, Is.True);
            Assert.That(result.SubscriptionCanceled, Is.True);
            Assert.That(result.EffectiveAt, Is.EqualTo(DateTime.UtcNow).Within(TimeSpan.FromSeconds(5)));
        });
        Assert.That(harness.SavedLedger!.RefundRequested, Is.True,
            "O estorno tem de constar no ledger de conformidade.");
    }

    // Estorno emitido = acesso já caiu. Não há período futuro para o Path B se apoiar; oferecê-lo
    // prometeria um acesso que não existe mais.
    [Test]
    public void A3_WithinRefundWindow_PathB_IsRejected()
    {
        var sub = SubscriptionBuilder.Active(startedDaysAgo: 3).Build();
        var harness = new AccountDeletionHarness()
            .WithSubscription(sub)
            .WhenCancelledReturns("RefundRequested", refundRequested: true, accessUntil: null);

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build().RequestAsync(AtPeriodEnd));

        Assert.That(ex.Message, Is.EqualTo("Não há período pago em vigência para agendar. Escolha excluir agora."));
    }

    // ── A4: estorno anterior em curso bloqueia ──────────────────────────────────────────────

    // Encerrar com um estorno em trânsito deixaria o dinheiro num limbo — o webhook chegaria numa
    // conta já em processo de anonimização.
    [Test]
    public void A4_SubscriptionInRefundRequested_BlocksTheRequest()
    {
        var harness = new AccountDeletionHarness()
            .WithSubscription(SubscriptionBuilder.RefundRequested().Build());

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build().RequestAsync(DeleteNow));

        Assert.That(ex.Message, Does.StartWith("Há um reembolso em processamento."));
    }

    [Test]
    public void A4_SubscriptionInRefundRequested_ChangesNothing()
    {
        var harness = new AccountDeletionHarness()
            .WithSubscription(SubscriptionBuilder.RefundRequested().Build());

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().RequestAsync(DeleteNow));

        Assert.Multiple(() =>
        {
            Assert.That(harness.User.AccountDeletionRequestedAt, Is.Null);
            Assert.That(harness.SavedLedger, Is.Null);
        });
        harness.Retention.VerifyNoOtherCalls();
    }

    // ── Trial ───────────────────────────────────────────────────────────────────────────────

    // T5: cancelar no trial corta o acesso na hora, sem cobrança e sem estorno.
    [Test]
    public async Task T5_RequestDuringTrial_CancelsWithoutRefundAndStartsGraceNow()
    {
        var harness = new AccountDeletionHarness()
            .WithSubscription(SubscriptionBuilder.Trialing().Build())
            .WhenCancelledReturns("Expired", refundRequested: false, accessUntil: null);

        var result = await harness.Build().RequestAsync(DeleteNow);

        Assert.Multiple(() =>
        {
            Assert.That(result.SubscriptionCanceled, Is.True);
            Assert.That(result.RefundRequested, Is.False);
            Assert.That(result.EffectiveAt, Is.EqualTo(DateTime.UtcNow).Within(TimeSpan.FromSeconds(5)));
        });
    }

    // No trial o acesso cai imediatamente — não há período pago para agendar.
    [Test]
    public void RequestDuringTrial_PathB_IsRejected()
    {
        var harness = new AccountDeletionHarness()
            .WithSubscription(SubscriptionBuilder.Trialing().Build())
            .WhenCancelledReturns("Expired", refundRequested: false, accessUntil: null);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().RequestAsync(AtPeriodEnd));
    }

    // ── Assinatura já sem acesso: nada a cancelar ───────────────────────────────────────────

    [TestCase("Expired")]
    [TestCase("Canceled")]
    public async Task RequestWithDeadSubscription_DoesNotCallCancelAgain(string status)
    {
        var sub = status == "Expired"
            ? SubscriptionBuilder.Expired().Build()
            : SubscriptionBuilder.Canceled().Build();
        var harness = new AccountDeletionHarness().WithSubscription(sub);

        var result = await harness.Build().RequestAsync(DeleteNow);

        harness.SubscriptionService.Verify(s => s.CancelAsync(), Times.Never,
            "Assinatura já encerrada não tem o que cancelar.");
        Assert.That(result.SubscriptionCanceled, Is.False);
    }

    // ── Pedido duplicado ────────────────────────────────────────────────────────────────────

    // Um segundo pedido reiniciaria a carência e daria ao usuário mais 30 dias sem querer.
    [Test]
    public void RequestWhenAlreadyPending_IsRejected()
    {
        var user = UserBuilder.AnOwner()
            .InTenant(Guid.NewGuid())
            .WithDeletionRequested(DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(-2))
            .Build();
        var harness = new AccountDeletionHarness().ForUser(user).WithSubscription(null);

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build().RequestAsync(DeleteNow));

        Assert.That(ex.Message, Is.EqualTo("Já existe um pedido de exclusão de conta em andamento."));
    }

    [Test]
    public void RequestForUnknownUser_ThrowsNotFound()
    {
        var harness = new AccountDeletionHarness();
        harness.Users.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((User?)null);

        Assert.ThrowsAsync<NotFoundException>(() => harness.Build().RequestAsync(DeleteNow));
    }
}
