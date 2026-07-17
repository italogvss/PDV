using FluentValidation;
using Moq;
using PDV.Application.DTOs.Auth;
using PDV.Application.Interfaces;
using PDV.Application.Validators.Auth;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Interfaces;
using PDV.Infrastructure.Services;

namespace PDV.UnitTests.Support.Harness;

// Monta o AuthService com as 8 dependências mockadas. Sem isto, cada teste repetiria a construção
// inteira e a intenção do teste sumiria no meio do arrange.
//
// Duas dependências NÃO são mock, de propósito:
//  - IConfiguration: real (in-memory). O service lê JWT_SECRET pelo indexer; um mock aqui só
//    reproduziria o indexer com mais ruído e menos fidelidade.
//  - IValidator<ChangePasswordRequest>: o validator real de produção. Mockar a validação faria os
//    testes de política de senha (mín. 8, número, especial) passarem sem exercitar regra nenhuma.
public sealed class AuthHarness
{
    public Mock<IUserRepository> Users { get; } = new();
    public Mock<IEmployeeRepository> Employees { get; } = new();
    public Mock<ITenantRoleRepository> Roles { get; } = new();
    public Mock<IStorageService> Storage { get; } = new();
    public Mock<IOAuthProvider> OAuth { get; } = new();
    public Mock<IAuthEventLogger> AuthEvents { get; } = new();

    public AuthService Build() => new(
        Users.Object,
        TestConfig.Create(),
        Employees.Object,
        Roles.Object,
        Storage.Object,
        OAuth.Object,
        AuthEvents.Object,
        new ChangePasswordRequestValidator());

    // ── Arranjos comuns ────────────────────────────────────────────────────────────────────

    public AuthHarness WithUser(User user)
    {
        Users.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
        if (user.Username is not null)
            Users.Setup(r => r.GetByUsernameAsync(user.Username)).ReturnsAsync(user);
        return this;
    }

    // O login local nunca deve encontrar um usuário por username desconhecido.
    public AuthHarness WithNoUserForUsername(string username)
    {
        Users.Setup(r => r.GetByUsernameAsync(username)).ReturnsAsync((User?)null);
        return this;
    }

    public AuthHarness WithGoogleUser(string providerId, User? user)
    {
        Users.Setup(r => r.GetByExternalAuthAsync("Google", providerId)).ReturnsAsync(user);
        return this;
    }

    // Resposta do provedor OAuth para uma credencial válida. A validação real (assinatura, audience,
    // e-mail verificado) é responsabilidade do GoogleOAuthProvider, fora do AuthService.
    public AuthHarness WithGoogleCredential(
        string credential, string providerId, string email = "novo@exemplo.com", string name = "Novo Usuário")
    {
        OAuth.Setup(p => p.ValidateAsync(credential))
             .ReturnsAsync(new OAuthUserInfo(providerId, email, true, name, null));
        return this;
    }

    // Vincula o User a um Employee com um cargo que tem (ou não) a permissão pedida.
    public AuthHarness WithEmployee(Guid userId, Guid tenantId, TenantRole role)
    {
        var employee = new Employee
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            RoleId = role.Id,
            Role = role,
        };
        Employees.Setup(r => r.GetByUserIdAsync(userId, tenantId)).ReturnsAsync(employee);
        Roles.Setup(r => r.GetByIdAsync(role.Id)).ReturnsAsync(role);
        return this;
    }

    // Captura o User gravado pelo service — é assim que se prova a rotação do refresh token e a
    // limpeza no logout, já que o repositório é mock e nada persiste.
    public User? SavedUser { get; private set; }

    public AuthHarness CapturingSaves()
    {
        Users.Setup(r => r.UpdateAsync(It.IsAny<User>()))
             .Callback<User>(u => SavedUser = u)
             .Returns(Task.CompletedTask);
        Users.Setup(r => r.AddAsync(It.IsAny<User>()))
             .Callback<User>(u => SavedUser = u)
             .Returns(Task.CompletedTask);
        return this;
    }

    public void AssertLogged(Guid userId, AccessEvent evt) =>
        AuthEvents.Verify(l => l.LogAsync(userId, It.IsAny<string>(), It.IsAny<Guid?>(), evt), Times.Once);
}
