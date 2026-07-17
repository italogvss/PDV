using FluentValidation;
using Moq;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support;
using PDV.UnitTests.Support.Builders;
using PDV.UnitTests.Support.Harness;
using BCryptNet = BCrypt.Net.BCrypt;

namespace PDV.UnitTests.Flows.Authentication;

// Fluxo: troca de senha obrigatória no 1º acesso do funcionário (docs/auth.md §3c).
// O que não pode falhar aqui: a senha nova é gravada como hash bcrypt, e o token reemitido perde o
// claim mustChangePassword — é o que libera o acesso na hora, sem esperar novo login.
[TestFixture]
public class ChangePasswordTests
{
    private const string NewPassword = "NovaSenha@2026";

    private static (AuthHarness Harness, User User) EmployeeWithTemporaryPassword()
    {
        var user = UserBuilder.AnEmployee()
            .WithLocalAuth("joao.atendente", mustChangePassword: true)
            .InTenant(Guid.NewGuid(), UserRole.Employee)
            .Build();
        return (new AuthHarness().WithUser(user).CapturingSaves(), user);
    }

    // ── Cenário 5 (auth.md §14): troca conclui e libera o acesso ────────────────────────────

    [Test]
    public async Task Scenario5_ChangePassword_ClearsMustChangePasswordAndStoresBcryptHash()
    {
        var (harness, user) = EmployeeWithTemporaryPassword();
        var oldHash = user.LocalAuth!.PasswordHash;

        await harness.Build().ChangePasswordAsync(user.Id, UserBuilder.DefaultPassword, NewPassword);

        Assert.Multiple(() =>
        {
            Assert.That(user.LocalAuth.MustChangePassword, Is.False);
            Assert.That(user.LocalAuth.PasswordHash, Is.Not.EqualTo(oldHash));
            Assert.That(user.LocalAuth.PasswordHash, Is.Not.EqualTo(NewPassword),
                "A senha nunca pode ser gravada em claro.");
            Assert.That(BCryptNet.Verify(NewPassword, user.LocalAuth.PasswordHash), Is.True,
                "O hash gravado tem de validar a senha nova.");
        });
    }

    // O token reemitido SEM o claim é o que destrava o MustChangePasswordMiddleware imediatamente —
    // o token que o funcionário ainda tem no cookie carrega o claim e barraria tudo.
    [Test]
    public async Task Scenario5_ChangePassword_ReissuesTokenWithoutMustChangePasswordClaim()
    {
        var (harness, user) = EmployeeWithTemporaryPassword();

        var accessToken = await harness.Build()
            .ChangePasswordAsync(user.Id, UserBuilder.DefaultPassword, NewPassword);

        Assert.That(JwtProbe.HasMustChangePassword(accessToken), Is.False);
    }

    // O token reemitido mantém a loja ativa e o papel — trocar a senha não é trocar de sessão.
    [Test]
    public async Task ChangePassword_ReissuedToken_KeepsTenantAndRole()
    {
        var tenantId = Guid.NewGuid();
        var user = UserBuilder.AnEmployee()
            .WithLocalAuth("joao.atendente", mustChangePassword: true)
            .InTenant(tenantId, UserRole.Employee)
            .Build();
        var harness = new AuthHarness().WithUser(user);

        var accessToken = await harness.Build()
            .ChangePasswordAsync(user.Id, UserBuilder.DefaultPassword, NewPassword);

        Assert.Multiple(() =>
        {
            Assert.That(JwtProbe.TenantId(accessToken), Is.EqualTo(tenantId.ToString()));
            Assert.That(JwtProbe.Role(accessToken), Is.EqualTo("Employee"));
        });
    }

    // ── Recusas ─────────────────────────────────────────────────────────────────────────────

    // Sem conferir a senha atual, quem roubasse um access_token trocaria a senha e tomaria a conta.
    [Test]
    public void ChangePassword_WrongCurrentPassword_ThrowsAndKeepsOldHash()
    {
        var (harness, user) = EmployeeWithTemporaryPassword();
        var oldHash = user.LocalAuth!.PasswordHash;

        var ex = Assert.ThrowsAsync<UnauthorizedException>(
            () => harness.Build().ChangePasswordAsync(user.Id, "senha-atual-errada", NewPassword));

        Assert.Multiple(() =>
        {
            Assert.That(ex.Message, Is.EqualTo("Senha atual incorreta."));
            Assert.That(user.LocalAuth.PasswordHash, Is.EqualTo(oldHash), "A senha não pode ter mudado.");
            Assert.That(user.LocalAuth.MustChangePassword, Is.True, "A obrigação de trocar continua de pé.");
        });
    }

    // Owner criado por Google não tem senha local para trocar.
    [Test]
    public void ChangePassword_UserWithoutLocalAuth_ThrowsBusinessException()
    {
        var user = UserBuilder.AnOwner().WithGoogle().InTenant(Guid.NewGuid()).Build();
        var harness = new AuthHarness().WithUser(user);

        var ex = Assert.ThrowsAsync<BusinessException>(
            () => harness.Build().ChangePasswordAsync(user.Id, UserBuilder.DefaultPassword, NewPassword));

        Assert.That(ex.Message, Is.EqualTo("Usuário não possui login por senha."));
    }

    [Test]
    public void ChangePassword_UnknownUser_ThrowsNotFound()
    {
        var harness = new AuthHarness();
        harness.Users.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((User?)null);

        Assert.ThrowsAsync<NotFoundException>(
            () => harness.Build().ChangePasswordAsync(Guid.NewGuid(), UserBuilder.DefaultPassword, NewPassword));
    }

    // ── Política de senha (ChangePasswordRequestValidator, exercitado de verdade) ────────────

    // O harness usa o validator real de produção — estes casos provam a política, não um mock.
    [TestCase("Curta1@", TestName = "ChangePassword_NewPasswordShorterThan8_IsRejected")]
    [TestCase("SenhaSemNumero@", TestName = "ChangePassword_NewPasswordWithoutDigit_IsRejected")]
    [TestCase("SenhaSemEspecial1", TestName = "ChangePassword_NewPasswordWithoutSpecialChar_IsRejected")]
    [TestCase("", TestName = "ChangePassword_EmptyNewPassword_IsRejected")]
    public void ChangePassword_WeakNewPassword_IsRejectedByPolicy(string weakPassword)
    {
        var (harness, user) = EmployeeWithTemporaryPassword();

        Assert.ThrowsAsync<ValidationException>(
            () => harness.Build().ChangePasswordAsync(user.Id, UserBuilder.DefaultPassword, weakPassword));
    }

    // A validação roda ANTES de tocar o usuário: uma senha fraca não pode nem chegar ao repositório.
    [Test]
    public void ChangePassword_WeakNewPassword_NeverReachesTheRepository()
    {
        var (harness, user) = EmployeeWithTemporaryPassword();

        Assert.ThrowsAsync<ValidationException>(
            () => harness.Build().ChangePasswordAsync(user.Id, UserBuilder.DefaultPassword, "fraca"));

        harness.Users.Verify(r => r.UpdateAsync(It.IsAny<User>()), Times.Never);
    }
}
