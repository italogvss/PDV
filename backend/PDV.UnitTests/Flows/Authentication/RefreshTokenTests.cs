using System.Security.Cryptography;
using System.Text;
using Moq;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Authentication;

// Fluxo: renovação transparente da sessão (docs/auth.md §10).
// O que não pode falhar aqui: a rotação é single-use (um refresh usado duas vezes não pode valer) e
// o claim mustChangePassword sobrevive à rotação — senão o enforcement sumia no 1º refresh.
[TestFixture]
public class RefreshTokenTests
{
    private static string Hash(string raw) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));

    // ── Cenário 9 (auth.md §14): refresh inválido/expirado desloga ──────────────────────────

    [Test]
    public void Refresh_UnknownToken_ThrowsUnauthorized()
    {
        var harness = new AuthHarness();
        harness.Users.Setup(r => r.GetByRefreshTokenAsync(It.IsAny<string>())).ReturnsAsync((User?)null);

        var ex = Assert.ThrowsAsync<UnauthorizedException>(() => harness.Build().RefreshAsync("token-qualquer"));

        Assert.That(ex.Message, Is.EqualTo("Refresh token inválido."));
    }

    [Test]
    public void Scenario9_ExpiredRefreshToken_ThrowsUnauthorized()
    {
        const string raw = "refresh-token-vencido";
        var user = UserBuilder.AnOwner()
            .InTenant(Guid.NewGuid())
            .WithRefreshToken(Hash(raw), DateTime.UtcNow.AddDays(-1))
            .Build();

        var harness = new AuthHarness();
        harness.Users.Setup(r => r.GetByRefreshTokenAsync(Hash(raw))).ReturnsAsync(user);

        var ex = Assert.ThrowsAsync<UnauthorizedException>(() => harness.Build().RefreshAsync(raw));

        Assert.That(ex.Message, Is.EqualTo("Refresh token expirado."));
    }

    // Um refresh sem expiry gravada é um registro corrompido — tratar como inválido, não como eterno.
    [Test]
    public void Refresh_TokenWithoutExpiry_ThrowsUnauthorized()
    {
        const string raw = "refresh-sem-expiry";
        var user = UserBuilder.AnOwner()
            .InTenant(Guid.NewGuid())
            .WithRefreshToken(Hash(raw), null)
            .Build();

        var harness = new AuthHarness();
        harness.Users.Setup(r => r.GetByRefreshTokenAsync(Hash(raw))).ReturnsAsync(user);

        Assert.ThrowsAsync<UnauthorizedException>(() => harness.Build().RefreshAsync(raw));
    }

    // O lookup é feito pelo HASH do token recebido. Se algum dia alguém buscar pelo raw, este teste
    // quebra — e é ele que garante que o banco nunca precisa conhecer o valor real.
    [Test]
    public async Task Refresh_LooksUpUserByHashedToken_NeverByRawValue()
    {
        const string raw = "refresh-token-valido";
        var user = UserBuilder.AnOwner()
            .InTenant(Guid.NewGuid())
            .WithRefreshToken(Hash(raw), DateTime.UtcNow.AddDays(10))
            .Build();

        var harness = new AuthHarness().CapturingSaves();
        harness.Users.Setup(r => r.GetByRefreshTokenAsync(Hash(raw))).ReturnsAsync(user);

        await harness.Build().RefreshAsync(raw);

        harness.Users.Verify(r => r.GetByRefreshTokenAsync(Hash(raw)), Times.Once);
        harness.Users.Verify(r => r.GetByRefreshTokenAsync(raw), Times.Never);
    }

    // ── Rotação single-use ──────────────────────────────────────────────────────────────────

    // O refresh anterior tem de deixar de valer no ato: o service devolve um raw novo e grava o hash
    // dele. Sem isto, um refresh vazado continuaria rendendo sessões para sempre.
    [Test]
    public async Task Refresh_Success_RotatesTokenSoThePreviousOneStopsWorking()
    {
        const string oldRaw = "refresh-token-antigo";
        var user = UserBuilder.AnOwner()
            .InTenant(Guid.NewGuid())
            .WithRefreshToken(Hash(oldRaw), DateTime.UtcNow.AddDays(10))
            .Build();

        var harness = new AuthHarness().CapturingSaves();
        harness.Users.Setup(r => r.GetByRefreshTokenAsync(Hash(oldRaw))).ReturnsAsync(user);

        var (_, newRaw) = await harness.Build().RefreshAsync(oldRaw);

        Assert.Multiple(() =>
        {
            Assert.That(newRaw, Is.Not.EqualTo(oldRaw), "O raw devolvido tem de ser novo.");
            Assert.That(harness.SavedUser!.RefreshToken, Is.EqualTo(Hash(newRaw)),
                "O hash gravado tem de ser o do token novo.");
            Assert.That(harness.SavedUser.RefreshToken, Is.Not.EqualTo(Hash(oldRaw)),
                "O hash antigo não pode sobreviver — é o que torna o token single-use.");
            Assert.That(harness.SavedUser.RefreshTokenExpiry,
                Is.EqualTo(DateTime.UtcNow.AddDays(30)).Within(TimeSpan.FromMinutes(1)),
                "A rotação renova a validade por mais 30 dias.");
        });
    }

    // ── O claim mustChangePassword sobrevive à rotação ──────────────────────────────────────

    // Bug histórico (auth.md §17, item 1): o refresh reemitia o token SEM o claim, então após o 1º
    // refresh o funcionário escapava do MustChangePasswordMiddleware com a senha temporária.
    [Test]
    public async Task Refresh_UserStillMustChangePassword_PreservesTheClaim()
    {
        const string raw = "refresh-token-valido";
        var user = UserBuilder.AnEmployee()
            .WithLocalAuth("joao.atendente", mustChangePassword: true)
            .InTenant(Guid.NewGuid(), UserRole.Employee)
            .WithRefreshToken(Hash(raw), DateTime.UtcNow.AddDays(10))
            .Build();

        var harness = new AuthHarness();
        harness.Users.Setup(r => r.GetByRefreshTokenAsync(Hash(raw))).ReturnsAsync(user);

        var (accessToken, _) = await harness.Build().RefreshAsync(raw);

        Assert.That(JwtProbe.HasMustChangePassword(accessToken), Is.True);
    }

    [Test]
    public async Task Refresh_UserAlreadyChangedPassword_OmitsTheClaim()
    {
        const string raw = "refresh-token-valido";
        var user = UserBuilder.AnEmployee()
            .WithLocalAuth("joao.atendente", mustChangePassword: false)
            .InTenant(Guid.NewGuid(), UserRole.Employee)
            .WithRefreshToken(Hash(raw), DateTime.UtcNow.AddDays(10))
            .Build();

        var harness = new AuthHarness();
        harness.Users.Setup(r => r.GetByRefreshTokenAsync(Hash(raw))).ReturnsAsync(user);

        var (accessToken, _) = await harness.Build().RefreshAsync(raw);

        Assert.That(JwtProbe.HasMustChangePassword(accessToken), Is.False);
    }

    // A rotação reemite o token com o tenant/role vigentes do vínculo — não com os do token anterior.
    [Test]
    public async Task Refresh_Success_ReissuesTokenWithCurrentMembershipRole()
    {
        const string raw = "refresh-token-valido";
        var tenantId = Guid.NewGuid();
        var user = UserBuilder.AnEmployee()
            .InTenant(tenantId, UserRole.Employee)
            .WithRefreshToken(Hash(raw), DateTime.UtcNow.AddDays(10))
            .Build();

        var harness = new AuthHarness();
        harness.Users.Setup(r => r.GetByRefreshTokenAsync(Hash(raw))).ReturnsAsync(user);

        var (accessToken, _) = await harness.Build().RefreshAsync(raw);

        Assert.Multiple(() =>
        {
            Assert.That(JwtProbe.TenantId(accessToken), Is.EqualTo(tenantId.ToString()));
            Assert.That(JwtProbe.Role(accessToken), Is.EqualTo("Employee"));
        });
    }

    // ── Logout (cenário 14) ─────────────────────────────────────────────────────────────────

    // O logout não revoga o access_token (JWT stateless, vale até 8h — trade-off documentado), mas
    // TEM de matar o refresh: sem isso a sessão se renovaria para sempre depois de sair.
    [Test]
    public async Task Scenario14_Logout_ClearsRefreshTokenSoSessionCannotBeRenewed()
    {
        var user = UserBuilder.AnOwner()
            .InTenant(Guid.NewGuid())
            .WithRefreshToken(Hash("qualquer"), DateTime.UtcNow.AddDays(10))
            .Build();
        var harness = new AuthHarness().WithUser(user).CapturingSaves();

        await harness.Build().LogoutAsync(user.Id);

        Assert.Multiple(() =>
        {
            Assert.That(harness.SavedUser!.RefreshToken, Is.Null);
            Assert.That(harness.SavedUser.RefreshTokenExpiry, Is.Null);
        });
        harness.AssertLogged(user.Id, AccessEvent.LoggedOut);
    }

    [Test]
    public void Logout_UnknownUser_ThrowsNotFound()
    {
        var harness = new AuthHarness();
        harness.Users.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((User?)null);

        Assert.ThrowsAsync<NotFoundException>(() => harness.Build().LogoutAsync(Guid.NewGuid()));
    }
}
