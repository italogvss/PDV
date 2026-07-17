using Moq;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.AccountDeletion;

// Fluxo: reverter o encerramento durante a carência (docs/account-deletion.md §9.2, cenário A7).
// É a última chance do usuário voltar atrás antes do strip. Se a reversão falhar em limpar
// qualquer um dos três sinais (flags do User, agendamento das lojas, ledger), o job de 24h apaga a
// conta de alguém que desistiu.
[TestFixture]
public class CancelAccountDeletionTests
{
    private static AccountDeletionHarness PendingRequest(DateTime? scheduledDeletionAt = null)
    {
        var effectiveAt = DateTime.UtcNow.AddDays(-2);
        var user = UserBuilder.AnOwner()
            .InTenant(Guid.NewGuid())
            .WithDeletionRequested(DateTime.UtcNow.AddDays(-2), effectiveAt)
            .Build();

        return new AccountDeletionHarness()
            .ForUser(user)
            .WithActiveLedger(scheduledDeletionAt ?? DateTime.UtcNow.AddDays(28));
    }

    // ── A7: reversão dentro do prazo ────────────────────────────────────────────────────────

    [Test]
    public async Task A7_CancelWithinGracePeriod_ClearsUserFlags()
    {
        var harness = PendingRequest();

        await harness.Build().CancelAsync();

        Assert.Multiple(() =>
        {
            Assert.That(harness.User.AccountDeletionRequestedAt, Is.Null);
            Assert.That(harness.User.AccountDeletionEffectiveAt, Is.Null,
                "Sem limpar isto, o middleware seguiria bloqueando a conta com 423.");
        });
    }

    [Test]
    public async Task A7_CancelWithinGracePeriod_ClearsScheduledDeletionOnStores()
    {
        var harness = PendingRequest();

        await harness.Build().CancelAsync();

        harness.Retention.Verify(r => r.ClearAccountDeletionForOwnerAsync(harness.User.Id), Times.Once);
    }

    [Test]
    public async Task A7_CancelWithinGracePeriod_MarksLedgerAsCancelled()
    {
        var harness = PendingRequest();

        await harness.Build().CancelAsync();

        Assert.That(harness.SavedLedger!.Status, Is.EqualTo(AccountDeletionStatus.Cancelled));
    }

    // Reativar ≠ reassinar: a conta volta, a assinatura não. O usuário cancelou o plano ao pedir o
    // encerramento e precisa contratar de novo — ressuscitar a assinatura cobraria sem consentimento.
    [Test]
    public async Task A7_Cancel_DoesNotResurrectTheSubscription()
    {
        var harness = PendingRequest();

        await harness.Build().CancelAsync();

        harness.SubscriptionService.VerifyNoOtherCalls();
    }

    // ── Recusas ─────────────────────────────────────────────────────────────────────────────

    // Depois do prazo o strip já rodou (ou está rodando): não há o que reverter, e fingir que
    // reverteu deixaria o usuário achando que os dados voltaram.
    [Test]
    public void Cancel_AfterGracePeriodExpired_IsRejected()
    {
        var harness = PendingRequest(scheduledDeletionAt: DateTime.UtcNow.AddMinutes(-1));

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build().CancelAsync());

        Assert.That(ex.Message, Is.EqualTo("O prazo de reversão da exclusão já venceu."));
    }

    [Test]
    public void Cancel_AfterGracePeriodExpired_ChangesNothing()
    {
        var harness = PendingRequest(scheduledDeletionAt: DateTime.UtcNow.AddMinutes(-1));

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CancelAsync());

        Assert.That(harness.User.AccountDeletionRequestedAt, Is.Not.Null,
            "O pedido continua de pé — a reversão foi recusada.");
        harness.Retention.VerifyNoOtherCalls();
    }

    [Test]
    public void Cancel_WithoutAnyPendingRequest_IsRejected()
    {
        var user = UserBuilder.AnOwner().InTenant(Guid.NewGuid()).Build();
        var harness = new AccountDeletionHarness().ForUser(user).WithoutActiveLedger();

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build().CancelAsync());

        Assert.That(ex.Message, Is.EqualTo("Não há pedido de exclusão de conta para reverter."));
    }

    // Flags do User dizem "pendente" mas o ledger sumiu: estado inconsistente, falhar fechado em vez
    // de limpar as flags e deixar o agendamento das lojas órfão.
    [Test]
    public void Cancel_FlagsSetButLedgerMissing_IsRejected()
    {
        var user = UserBuilder.AnOwner()
            .InTenant(Guid.NewGuid())
            .WithDeletionRequested(DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(-1))
            .Build();
        var harness = new AccountDeletionHarness().ForUser(user).WithoutActiveLedger();

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CancelAsync());
    }

    [Test]
    public void Cancel_UnknownUser_ThrowsNotFound()
    {
        var harness = new AccountDeletionHarness();
        harness.Users.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((User?)null);

        Assert.ThrowsAsync<NotFoundException>(() => harness.Build().CancelAsync());
    }
}
