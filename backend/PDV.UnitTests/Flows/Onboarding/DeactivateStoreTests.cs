using Moq;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Onboarding;

// Fluxo: o Owner encerra UMA loja (docs/auth.md §11 cenário 13, account-deletion.md §3 e E1).
// Não confundir com encerrar a CONTA: aqui o usuário continua, as outras lojas continuam, e só
// aquela loja entra no pipeline de exclusão — com prazo próprio de 90 dias.
[TestFixture]
public class DeactivateStoreTests
{
    // Owner com duas lojas; a "atual" é a que será encerrada.
    private static (TenantHarness Harness, User User, Guid Current, Guid Other) OwnerWithTwoStores()
    {
        var current = Guid.NewGuid();
        var other = Guid.NewGuid();
        var user = UserBuilder.AnOwner()
            .InTenant(current, UserRole.Owner)
            .InTenant(other, UserRole.Owner)
            .WithLastTenant(current)
            .Build();

        return (new TenantHarness().ForUser(user).WithCurrentTenant(current), user, current, other);
    }

    // ── Cenário 13 / E1: encerrar uma loja tendo outra ──────────────────────────────────────

    [Test]
    public async Task Scenario13_DeactivateStore_MarksItInactiveAndSchedulesDeletionIn90Days()
    {
        var (harness, user, current, _) = OwnerWithTwoStores();
        var tenant = user.UserTenants.First(ut => ut.TenantId == current).Tenant;

        await harness.Build().DeactivateCurrentAsync(user.Id);

        Assert.Multiple(() =>
        {
            Assert.That(tenant.IsActive, Is.False);
            Assert.That(tenant.ScheduledDeletionAt,
                Is.EqualTo(DateTime.UtcNow.AddDays(RetentionDefaults.DaysAfterAccessLoss)).Within(TimeSpan.FromMinutes(1)),
                "Encerrar uma loja usa a retenção de 90 dias, não a carência de 30 da exclusão de conta.");
        });
        harness.Tenants.Verify(r => r.UpdateAsync(tenant), Times.Once);
    }

    // O usuário não pode ficar preso numa loja encerrada: o token é reemitido apontando para outra
    // loja ativa, com o papel daquele vínculo.
    [Test]
    public async Task Scenario13_DeactivateStore_SwitchesToAnotherActiveStoreAndReissuesToken()
    {
        var (harness, user, _, other) = OwnerWithTwoStores();

        var accessToken = await harness.Build().DeactivateCurrentAsync(user.Id);

        Assert.Multiple(() =>
        {
            Assert.That(user.LastTenantId, Is.EqualTo(other));
            Assert.That(JwtProbe.TenantId(accessToken), Is.EqualTo(other.ToString()));
            Assert.That(JwtProbe.Role(accessToken), Is.EqualTo("Owner"));
        });
    }

    // E1: encerrar a loja não toca o User — a conta segue viva e as outras lojas também.
    [Test]
    public async Task E1_DeactivateStore_LeavesTheUserAndOtherStoresUntouched()
    {
        var (harness, user, _, other) = OwnerWithTwoStores();
        var otherTenant = user.UserTenants.First(ut => ut.TenantId == other).Tenant;

        await harness.Build().DeactivateCurrentAsync(user.Id);

        Assert.Multiple(() =>
        {
            Assert.That(user.IsActive, Is.True);
            Assert.That(user.AccountDeletionRequestedAt, Is.Null, "Encerrar loja ≠ encerrar conta.");
            Assert.That(otherTenant.IsActive, Is.True);
            Assert.That(otherTenant.ScheduledDeletionAt, Is.Null, "Só a loja encerrada entra no pipeline.");
        });
    }

    // A assinatura é do Owner e cobre todas as lojas — encerrar uma não a cancela.
    [Test]
    public async Task DeactivateStore_DoesNotCancelTheSubscription()
    {
        var (harness, user, _, _) = OwnerWithTwoStores();
        harness.WithExistingSubscription(SubscriptionBuilder.Active().OwnedBy(user.Id).Build());

        await harness.Build().DeactivateCurrentAsync(user.Id);

        harness.Subscriptions.Verify(r => r.UpdateAsync(It.IsAny<Subscription>()), Times.Never);
    }

    // ── Recusas ─────────────────────────────────────────────────────────────────────────────

    // A trava que impede o usuário de ficar sem loja nenhuma (e sem para onde apontar o token).
    [Test]
    public void DeactivateStore_WhenItIsTheOnlyActiveOne_IsRejected()
    {
        var current = Guid.NewGuid();
        var user = UserBuilder.AnOwner().InTenant(current, UserRole.Owner).Build();
        var harness = new TenantHarness().ForUser(user).WithCurrentTenant(current);

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build().DeactivateCurrentAsync(user.Id));

        Assert.That(ex.Message, Does.Contain("único estabelecimento ativo"));
    }

    [Test]
    public void DeactivateStore_WhenTheOnlyOtherStoreIsAlreadyInactive_IsRejected()
    {
        var current = Guid.NewGuid();
        var other = Guid.NewGuid();
        var user = UserBuilder.AnOwner()
            .InTenant(current, UserRole.Owner)
            .InTenant(other, UserRole.Owner)
            .WithLastTenant(current)
            .Build();
        user.UserTenants.First(ut => ut.TenantId == other).Tenant.IsActive = false;
        var harness = new TenantHarness().ForUser(user).WithCurrentTenant(current);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().DeactivateCurrentAsync(user.Id));
    }

    [Test]
    public void DeactivateStore_RejectedRequest_ChangesNothing()
    {
        var current = Guid.NewGuid();
        var user = UserBuilder.AnOwner().InTenant(current, UserRole.Owner).Build();
        var tenant = user.UserTenants.First().Tenant;
        var harness = new TenantHarness().ForUser(user).WithCurrentTenant(current);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().DeactivateCurrentAsync(user.Id));

        Assert.Multiple(() =>
        {
            Assert.That(tenant.IsActive, Is.True);
            Assert.That(tenant.ScheduledDeletionAt, Is.Null);
        });
        harness.Tenants.Verify(r => r.UpdateAsync(It.IsAny<Tenant>()), Times.Never);
    }

    // Só o dono encerra a loja — um funcionário com token daquele tenant não pode.
    [Test]
    public void DeactivateStore_ByEmployee_IsUnauthorized()
    {
        var current = Guid.NewGuid();
        var user = UserBuilder.AnEmployee()
            .InTenant(current, UserRole.Employee)
            .InTenant(Guid.NewGuid(), UserRole.Employee)
            .WithLastTenant(current)
            .Build();
        var harness = new TenantHarness().ForUser(user).WithCurrentTenant(current);

        var ex = Assert.ThrowsAsync<UnauthorizedException>(() => harness.Build().DeactivateCurrentAsync(user.Id));

        Assert.That(ex.Message, Is.EqualTo("Apenas o proprietário pode encerrar o estabelecimento."));
    }

    // Token com um tenantId ao qual o usuário não pertence — isolamento multi-tenant.
    [Test]
    public void DeactivateStore_WhenUserHasNoLinkToCurrentTenant_ThrowsNotFound()
    {
        var user = UserBuilder.AnOwner().InTenant(Guid.NewGuid(), UserRole.Owner).Build();
        var harness = new TenantHarness().ForUser(user).WithCurrentTenant(Guid.NewGuid());

        Assert.ThrowsAsync<NotFoundException>(() => harness.Build().DeactivateCurrentAsync(user.Id));
    }

    [Test]
    public void DeactivateStore_UnknownUser_ThrowsNotFound()
    {
        var harness = new TenantHarness();
        harness.Users.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((User?)null);

        Assert.ThrowsAsync<NotFoundException>(() => harness.Build().DeactivateCurrentAsync(Guid.NewGuid()));
    }
}
