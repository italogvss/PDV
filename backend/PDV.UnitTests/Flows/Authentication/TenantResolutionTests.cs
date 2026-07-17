using Moq;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Authentication;

// Fluxo: qual loja e qual papel o token carrega (docs/auth.md §11 — ResolveActiveTenant).
// É o eixo mais sensível do multi-tenant: o claim tenantId alimenta o HasQueryFilter global do
// AppDbContext. Um tenantId errado aqui não dá erro — dá acesso aos dados de outra loja.
[TestFixture]
public class TenantResolutionTests
{
    private const string Credential = "google-id-token";
    private const string GoogleSub = "google-sub-abc";

    // Emite um token pelo caminho de login Google, que é o mais curto até o ResolveActiveTenant.
    private static async Task<string> TokenFor(User user)
    {
        var harness = new AuthHarness()
            .WithGoogleCredential(Credential, GoogleSub, user.Email, user.Name)
            .WithGoogleUser(GoogleSub, user);
        var (accessToken, _) = await harness.Build().LoginWithGoogleAsync(Credential);
        return accessToken;
    }

    // ── O papel vem do vínculo, nunca do User.Role global ───────────────────────────────────

    // Bug histórico (auth.md §17, item 3): se o role saísse de User.Role, alguém que é Owner numa
    // loja e Employee em outra levaria "Owner" para a loja onde é só funcionário — e o frontend
    // liberaria a UI inteira. O papel tem de ser o do vínculo da loja ATIVA.
    [Test]
    public async Task ResolveTenant_UserIsOwnerInOneStoreAndEmployeeInAnother_UsesActiveMembershipRole()
    {
        var ownedStore = Guid.NewGuid();
        var employedStore = Guid.NewGuid();
        var user = UserBuilder.AnOwner()          // User.Role global = Owner
            .WithGoogle(GoogleSub)
            .InTenant(ownedStore, UserRole.Owner)
            .InTenant(employedStore, UserRole.Employee)
            .WithLastTenant(employedStore)        // ativo = a loja onde ele é FUNCIONÁRIO
            .Build();

        var accessToken = await TokenFor(user);

        Assert.Multiple(() =>
        {
            Assert.That(JwtProbe.TenantId(accessToken), Is.EqualTo(employedStore.ToString()));
            Assert.That(JwtProbe.Role(accessToken), Is.EqualTo("Employee"),
                "O papel tem de vir do UserTenant da loja ativa, não do User.Role global.");
        });
    }

    [Test]
    public async Task ResolveTenant_LastTenantIdSet_ActivatesThatStore()
    {
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        var user = UserBuilder.AnOwner()
            .WithGoogle(GoogleSub)
            .InTenant(first, UserRole.Owner)
            .InTenant(second, UserRole.Owner)
            .WithLastTenant(second)
            .Build();

        var accessToken = await TokenFor(user);

        Assert.That(JwtProbe.TenantId(accessToken), Is.EqualTo(second.ToString()));
    }

    // LastTenantId apontando para uma loja que não é mais vínculo (ex.: acesso removido) não pode
    // deixar o usuário travado: cai para o primeiro vínculo válido.
    [Test]
    public async Task ResolveTenant_LastTenantIdNoLongerAMembership_FallsBackToFirstMembership()
    {
        var valid = Guid.NewGuid();
        var user = UserBuilder.AnOwner()
            .WithGoogle(GoogleSub)
            .InTenant(valid, UserRole.Owner)
            .WithLastTenant(Guid.NewGuid())   // loja órfã
            .Build();

        var accessToken = await TokenFor(user);

        Assert.That(JwtProbe.TenantId(accessToken), Is.EqualTo(valid.ToString()));
    }

    // Onboarding: sem loja, o token sai com tenantId vazio e role vazio. O RouterGuard usa isso para
    // mandar o usuário a /criar-negocio.
    [Test]
    public async Task ResolveTenant_UserWithoutAnyStore_EmitsEmptyTenantAndRole()
    {
        var user = UserBuilder.AnOwner().WithGoogle(GoogleSub).Build();

        var accessToken = await TokenFor(user);

        Assert.Multiple(() =>
        {
            Assert.That(JwtProbe.TenantId(accessToken), Is.Empty);
            Assert.That(JwtProbe.Role(accessToken), Is.Empty);
        });
    }

    // Admin de plataforma não tem vínculo de loja. O código resolve o Admin ANTES do caminho
    // "sem tenant" justamente porque, caindo lá, o role sairia vazio e o [Authorize(Roles="Admin")]
    // barraria o próprio admin (403).
    [Test]
    public async Task ResolveTenant_PlatformAdminWithoutStores_StillEmitsAdminRole()
    {
        var user = UserBuilder.AnAdmin().WithGoogle(GoogleSub).Build();

        var accessToken = await TokenFor(user);

        Assert.Multiple(() =>
        {
            Assert.That(JwtProbe.Role(accessToken), Is.EqualTo("Admin"),
                "Sem o role, o AdminController barraria o próprio admin.");
            Assert.That(JwtProbe.TenantId(accessToken), Is.Empty);
        });
    }

    // ── Troca de loja (cenário 7) ───────────────────────────────────────────────────────────

    [Test]
    public async Task Scenario7_SwitchTenant_ReissuesTokenWithTargetStoreAndItsRole()
    {
        var storeA = Guid.NewGuid();
        var storeB = Guid.NewGuid();
        var user = UserBuilder.AnOwner()
            .InTenant(storeA, UserRole.Owner)
            .InTenant(storeB, UserRole.Employee)
            .WithLastTenant(storeA)
            .Build();
        var harness = new AuthHarness().WithUser(user).CapturingSaves();

        var accessToken = await harness.Build().SwitchTenantAsync(user.Id, storeB);

        Assert.Multiple(() =>
        {
            Assert.That(JwtProbe.TenantId(accessToken), Is.EqualTo(storeB.ToString()));
            Assert.That(JwtProbe.Role(accessToken), Is.EqualTo("Employee"),
                "Ao trocar de loja o papel acompanha o vínculo da loja de destino.");
            Assert.That(harness.SavedUser!.LastTenantId, Is.EqualTo(storeB));
        });
    }

    // O ponto crítico: trocar para uma loja onde não há vínculo tem de ser recusado. Se passasse,
    // o token sairia com o tenantId de outra empresa e o query filter entregaria os dados dela.
    [Test]
    public void SwitchTenant_ToStoreUserDoesNotBelongTo_ThrowsUnauthorized()
    {
        var ownStore = Guid.NewGuid();
        var someoneElsesStore = Guid.NewGuid();
        var user = UserBuilder.AnOwner().InTenant(ownStore, UserRole.Owner).Build();
        var harness = new AuthHarness().WithUser(user).CapturingSaves();

        var ex = Assert.ThrowsAsync<UnauthorizedException>(
            () => harness.Build().SwitchTenantAsync(user.Id, someoneElsesStore));

        Assert.Multiple(() =>
        {
            Assert.That(ex.Message, Is.EqualTo("Usuário não pertence a este tenant."));
            Assert.That(harness.SavedUser, Is.Null, "Uma troca recusada não pode gravar LastTenantId.");
        });
    }

    [Test]
    public void SwitchTenant_UnknownUser_ThrowsNotFound()
    {
        var harness = new AuthHarness();
        harness.Users.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((User?)null);

        Assert.ThrowsAsync<NotFoundException>(
            () => harness.Build().SwitchTenantAsync(Guid.NewGuid(), Guid.NewGuid()));
    }
}
