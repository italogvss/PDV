using System.Security.Cryptography;
using System.Text;
using Moq;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Authentication;

// Fluxo: funcionário entra com username + senha (docs/auth.md §3b).
// O que não pode falhar aqui: a mensagem de erro não pode revelar se o usuário existe, e o refresh
// token não pode ser gravado em claro.
[TestFixture]
public class LoginLocalTests
{
    private const string Username = "joao.atendente";

    // ── Credenciais inválidas: a MESMA mensagem em todos os casos ───────────────────────────
    // O login local não pode virar um oráculo de enumeração de usuários. Os quatro caminhos de
    // falha (inexistente, inativo, sem senha cadastrada, senha errada) têm de ser indistinguíveis
    // para quem está do lado de fora.

    [Test]
    public void LoginLocal_UnknownUsername_ThrowsGenericCredentialsError()
    {
        var harness = new AuthHarness().WithNoUserForUsername(Username);
        var sut = harness.Build();

        var ex = Assert.ThrowsAsync<UnauthorizedException>(
            () => sut.LoginWithLocalAsync(Username, "qualquer-senha"));

        Assert.That(ex.Message, Is.EqualTo("Credenciais inválidas."));
    }

    [Test]
    public void LoginLocal_InactiveUser_ThrowsGenericCredentialsError()
    {
        var user = UserBuilder.AnEmployee().WithLocalAuth(Username).Inactive().Build();
        var sut = new AuthHarness().WithUser(user).Build();

        var ex = Assert.ThrowsAsync<UnauthorizedException>(
            () => sut.LoginWithLocalAsync(Username, UserBuilder.DefaultPassword));

        Assert.That(ex.Message, Is.EqualTo("Credenciais inválidas."));
    }

    // Owner criado por Google não tem LocalAuth — tentar entrar por senha não pode vazar que a
    // conta existe.
    [Test]
    public void LoginLocal_UserWithoutLocalAuth_ThrowsGenericCredentialsError()
    {
        var user = UserBuilder.AnOwner().WithGoogle().Build();
        user.Username = Username;
        var harness = new AuthHarness();
        harness.Users.Setup(r => r.GetByUsernameAsync(Username)).ReturnsAsync(user);

        var ex = Assert.ThrowsAsync<UnauthorizedException>(
            () => harness.Build().LoginWithLocalAsync(Username, UserBuilder.DefaultPassword));

        Assert.That(ex.Message, Is.EqualTo("Credenciais inválidas."));
    }

    [Test]
    public void LoginLocal_WrongPassword_ThrowsGenericCredentialsError()
    {
        var user = UserBuilder.AnEmployee().WithLocalAuth(Username).Build();
        var sut = new AuthHarness().WithUser(user).Build();

        var ex = Assert.ThrowsAsync<UnauthorizedException>(
            () => sut.LoginWithLocalAsync(Username, "senha-errada"));

        Assert.That(ex.Message, Is.EqualTo("Credenciais inválidas."));
    }

    // ── Cenários 4 e 5 (auth.md §14): senha temporária ──────────────────────────────────────

    // O funcionário provisionado pelo Owner nasce com MustChangePassword. O claim é o que o
    // MustChangePasswordMiddleware usa para barrar a API inteira — sem ele, a senha temporária
    // daria acesso pleno.
    [Test]
    public async Task Scenario4_FirstLoginWithTemporaryPassword_EmitsMustChangePasswordClaim()
    {
        var tenantId = Guid.NewGuid();
        var user = UserBuilder.AnEmployee()
            .WithLocalAuth(Username, mustChangePassword: true)
            .InTenant(tenantId, UserRole.Employee)
            .Build();
        var sut = new AuthHarness().WithUser(user).Build();

        var (accessToken, _) = await sut.LoginWithLocalAsync(Username, UserBuilder.DefaultPassword);

        Assert.That(JwtProbe.HasMustChangePassword(accessToken), Is.True);
    }

    [Test]
    public async Task Scenario5_LoginAfterPasswordChanged_OmitsMustChangePasswordClaim()
    {
        var tenantId = Guid.NewGuid();
        var user = UserBuilder.AnEmployee()
            .WithLocalAuth(Username, mustChangePassword: false)
            .InTenant(tenantId, UserRole.Employee)
            .Build();
        var sut = new AuthHarness().WithUser(user).Build();

        var (accessToken, _) = await sut.LoginWithLocalAsync(Username, UserBuilder.DefaultPassword);

        Assert.That(JwtProbe.HasMustChangePassword(accessToken), Is.False);
    }

    // ── Refresh token: o banco nunca vê o valor raw ─────────────────────────────────────────

    // Vazamento do banco não pode virar sessão válida: o que se grava é SHA256(raw), e o raw só
    // existe no cookie. Este teste recalcula o hash de fora para provar a equivalência.
    [Test]
    public async Task LoginLocal_Success_PersistsOnlyHashedRefreshToken()
    {
        var user = UserBuilder.AnEmployee()
            .WithLocalAuth(Username)
            .InTenant(Guid.NewGuid(), UserRole.Employee)
            .Build();
        var harness = new AuthHarness().WithUser(user).CapturingSaves();

        var (_, rawRefreshToken) = await harness.Build()
            .LoginWithLocalAsync(Username, UserBuilder.DefaultPassword);

        var expectedHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(rawRefreshToken)));

        Assert.Multiple(() =>
        {
            Assert.That(harness.SavedUser!.RefreshToken, Is.EqualTo(expectedHash));
            Assert.That(harness.SavedUser.RefreshToken, Is.Not.EqualTo(rawRefreshToken));
            Assert.That(harness.SavedUser.RefreshTokenExpiry,
                Is.EqualTo(DateTime.UtcNow.AddDays(30)).Within(TimeSpan.FromMinutes(1)));
        });
    }

    // O token carrega o role do VÍNCULO com a loja (UserTenant.Role), não o User.Role global.
    [Test]
    public async Task LoginLocal_Success_EmitsTenantAndRoleFromMembership()
    {
        var tenantId = Guid.NewGuid();
        var user = UserBuilder.AnEmployee()
            .WithLocalAuth(Username)
            .InTenant(tenantId, UserRole.Employee)
            .Build();
        var sut = new AuthHarness().WithUser(user).Build();

        var (accessToken, _) = await sut.LoginWithLocalAsync(Username, UserBuilder.DefaultPassword);

        Assert.Multiple(() =>
        {
            Assert.That(JwtProbe.Subject(accessToken), Is.EqualTo(user.Id.ToString()));
            Assert.That(JwtProbe.TenantId(accessToken), Is.EqualTo(tenantId.ToString()));
            Assert.That(JwtProbe.Role(accessToken), Is.EqualTo("Employee"));
        });
    }

    // L1 (account-deletion.md §14): todo login entra no AccessLog — exigência do Marco Civil art. 15.
    [Test]
    public async Task L1_LoginLocal_Success_RecordsAccessLog()
    {
        var user = UserBuilder.AnEmployee()
            .WithLocalAuth(Username)
            .InTenant(Guid.NewGuid(), UserRole.Employee)
            .Build();
        var harness = new AuthHarness().WithUser(user);

        await harness.Build().LoginWithLocalAsync(Username, UserBuilder.DefaultPassword);

        harness.AssertLogged(user.Id, AccessEvent.LoggedIn);
    }

    // Uma tentativa recusada não pode registrar um login que não aconteceu.
    [Test]
    public void LoginLocal_WrongPassword_DoesNotRecordAccessLog()
    {
        var user = UserBuilder.AnEmployee().WithLocalAuth(Username).Build();
        var harness = new AuthHarness().WithUser(user);

        Assert.ThrowsAsync<UnauthorizedException>(
            () => harness.Build().LoginWithLocalAsync(Username, "senha-errada"));

        harness.AuthEvents.VerifyNoOtherCalls();
    }
}
