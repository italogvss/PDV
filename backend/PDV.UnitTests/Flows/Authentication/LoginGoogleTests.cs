using Moq;
using PDV.Application.Interfaces;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.UnitTests.Support;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Authentication;

// Fluxo: proprietário entra com Google (docs/auth.md §3a).
// O que não pode falhar aqui: a conta é achada pelo ExternalAuth e NUNCA por e-mail — o fallback
// por e-mail é um vetor de account takeover.
[TestFixture]
public class LoginGoogleTests
{
    private const string Credential = "google-id-token-valido";
    private const string GoogleSub = "google-sub-abc123";
    private const string Email = "dono@exemplo.com";

    // ── Cenário 1 (auth.md §14): Owner novo, 1º login ────────────────────────────────────────

    [Test]
    public async Task Scenario1_FirstGoogleLogin_CreatesOwnerWithExternalAuth()
    {
        var harness = new AuthHarness()
            .WithGoogleCredential(Credential, GoogleSub, Email, "Dono Novo")
            .WithGoogleUser(GoogleSub, null)
            .CapturingSaves();

        await harness.Build().LoginWithGoogleAsync(Credential);

        var created = harness.SavedUser;
        Assert.Multiple(() =>
        {
            Assert.That(created, Is.Not.Null);
            Assert.That(created!.Role, Is.EqualTo(UserRole.Owner), "Quem entra por Google é sempre Owner.");
            Assert.That(created.Email, Is.EqualTo(Email));
            Assert.That(created.Settings, Is.Not.Null, "UserSettings nasce junto — o /auth/me depende dele.");
            Assert.That(created.ExternalLogins.Any(e => e.Provider == "Google" && e.ProviderId == GoogleSub),
                Is.True);
        });
        harness.Users.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Once);
    }

    // Owner novo não tem loja: o token sai com tenantId vazio e o RouterGuard manda para
    // /criar-negocio. Um tenantId inventado aqui daria acesso à loja de outro.
    [Test]
    public async Task Scenario1_FirstGoogleLogin_EmitsTokenWithoutTenant()
    {
        var harness = new AuthHarness()
            .WithGoogleCredential(Credential, GoogleSub, Email)
            .WithGoogleUser(GoogleSub, null);

        var (accessToken, _) = await harness.Build().LoginWithGoogleAsync(Credential);

        Assert.That(JwtProbe.TenantId(accessToken), Is.Empty);
    }

    // ── Account takeover: sem fallback por e-mail ────────────────────────────────────────────

    // O cenário perigoso: existe um Employee (login local) cujo e-mail é o mesmo do Google. Se o
    // AuthService caísse para busca por e-mail, quem controlasse esse endereço no Google assumiria
    // a conta do funcionário. O contrato é achar SÓ por ExternalAuth — o e-mail coincidente tem de
    // resultar num usuário NOVO e separado.
    [Test]
    public async Task GoogleLogin_EmailMatchesExistingLocalAccount_DoesNotHijackIt()
    {
        var existingEmployee = UserBuilder.AnEmployee()
            .WithEmail(Email)
            .WithLocalAuth("joao.atendente")
            .Build();

        var harness = new AuthHarness()
            .WithGoogleCredential(Credential, GoogleSub, Email, "Impostor")
            .WithGoogleUser(GoogleSub, null)   // nenhum vínculo Google existe
            .CapturingSaves();
        harness.Users.Setup(r => r.GetByEmailAsync(Email)).ReturnsAsync(existingEmployee);

        await harness.Build().LoginWithGoogleAsync(Credential);

        Assert.Multiple(() =>
        {
            Assert.That(harness.SavedUser!.Id, Is.Not.EqualTo(existingEmployee.Id),
                "Deve criar um usuário novo, nunca reaproveitar a conta local que só coincide no e-mail.");
            Assert.That(harness.SavedUser.Role, Is.EqualTo(UserRole.Owner));
        });
        harness.Users.Verify(r => r.GetByEmailAsync(It.IsAny<string>()), Times.Never,
            "A busca por e-mail não pode participar do login Google.");
    }

    // ── Cenário 2: Owner recorrente ─────────────────────────────────────────────────────────

    [Test]
    public async Task Scenario2_ReturningOwnerWithStore_EmitsTokenWithTenantAndOwnerRole()
    {
        var tenantId = Guid.NewGuid();
        var user = UserBuilder.AnOwner()
            .WithEmail(Email)
            .WithGoogle(GoogleSub)
            .InTenant(tenantId, UserRole.Owner)
            .Build();

        var harness = new AuthHarness()
            .WithGoogleCredential(Credential, GoogleSub, Email, user.Name)
            .WithGoogleUser(GoogleSub, user);

        var (accessToken, _) = await harness.Build().LoginWithGoogleAsync(Credential);

        Assert.Multiple(() =>
        {
            Assert.That(JwtProbe.TenantId(accessToken), Is.EqualTo(tenantId.ToString()));
            Assert.That(JwtProbe.Role(accessToken), Is.EqualTo("Owner"));
        });
        harness.Users.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Never);
    }

    // O perfil do Google é a fonte de verdade do nome/foto: mudou lá, reflete aqui.
    [Test]
    public async Task GoogleLogin_ProfileChangedAtGoogle_UpdatesNameAndImage()
    {
        var user = UserBuilder.AnOwner()
            .WithEmail(Email)
            .WithGoogle(GoogleSub)
            .WithImage("https://google/foto-antiga.jpg")
            .InTenant(Guid.NewGuid())
            .Build();
        user.Name = "Nome Antigo";

        var harness = new AuthHarness().WithGoogleUser(GoogleSub, user).CapturingSaves();
        harness.OAuth.Setup(p => p.ValidateAsync(Credential)).ReturnsAsync(
            new OAuthUserInfo(
                ProviderId: GoogleSub,
                Email: Email,
                EmailVerified: true,
                Name: "Nome Novo",
                AvatarUrl: "https://google/foto-nova.jpg"));

        await harness.Build().LoginWithGoogleAsync(Credential);

        Assert.Multiple(() =>
        {
            Assert.That(harness.SavedUser!.Name, Is.EqualTo("Nome Novo"));
            Assert.That(harness.SavedUser.ImageUrl, Is.EqualTo("https://google/foto-nova.jpg"));
        });
    }

    // Conta criada por outro meio que depois entra com Google: vincula o provedor à conta existente
    // em vez de duplicá-la.
    [Test]
    public async Task GoogleLogin_UserFoundWithoutGoogleLink_LinksProviderInstead()
    {
        var user = UserBuilder.AnOwner().WithEmail(Email).InTenant(Guid.NewGuid()).Build();
        var harness = new AuthHarness()
            .WithGoogleCredential(Credential, GoogleSub, Email, user.Name)
            .WithGoogleUser(GoogleSub, user)
            .CapturingSaves();

        await harness.Build().LoginWithGoogleAsync(Credential);

        Assert.That(harness.SavedUser!.ExternalLogins.Any(e => e.Provider == "Google" && e.ProviderId == GoogleSub),
            Is.True);
        harness.Users.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Never);
    }

    [Test]
    public async Task L1_GoogleLogin_Success_RecordsAccessLog()
    {
        var user = UserBuilder.AnOwner().WithGoogle(GoogleSub).InTenant(Guid.NewGuid()).Build();
        var harness = new AuthHarness()
            .WithGoogleCredential(Credential, GoogleSub, Email, user.Name)
            .WithGoogleUser(GoogleSub, user);

        await harness.Build().LoginWithGoogleAsync(Credential);

        harness.AssertLogged(user.Id, AccessEvent.LoggedIn);
    }
}
