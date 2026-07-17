using PDV.Domain.Entities;
using PDV.Domain.Enums;
using BCryptNet = BCrypt.Net.BCrypt;

namespace PDV.UnitTests.Support.Builders;

// Object mother do User. O AuthService resolve tenant/role a partir de UserTenants + LastTenantId,
// então montar esse grafo à mão em cada teste esconderia o que o teste realmente exercita.
public sealed class UserBuilder
{
    public const string DefaultPassword = "Senha@123";

    // BCrypt com work factor default custa ~100ms por hash. Gerar uma vez por execução mantém a
    // suíte rápida sem trocar o hash real por um fake (o AuthService chama BCryptNet.Verify estático).
    private static readonly Lazy<string> DefaultPasswordHash =
        new(() => BCryptNet.HashPassword(DefaultPassword));

    private readonly User _user = new()
    {
        Id = Guid.NewGuid(),
        Name = "Fulano de Tal",
        Email = "fulano@exemplo.com",
        Role = UserRole.Owner,
        IsActive = true,
    };

    public static UserBuilder AnOwner() => new();

    public static UserBuilder AnEmployee() => new UserBuilder().WithRole(UserRole.Employee);

    public static UserBuilder AnAdmin() => new UserBuilder().WithRole(UserRole.Admin);

    public UserBuilder WithId(Guid id) { _user.Id = id; return this; }

    public UserBuilder WithRole(UserRole role) { _user.Role = role; return this; }

    public UserBuilder WithEmail(string email) { _user.Email = email; return this; }

    public UserBuilder Inactive() { _user.IsActive = false; return this; }

    public UserBuilder WithImage(string? imageUrl) { _user.ImageUrl = imageUrl; return this; }

    public UserBuilder WithSettings()
    {
        _user.Settings = new UserSettings { UserId = _user.Id, Theme = Theme.Light };
        return this;
    }

    // Login local. `mustChangePassword` reproduz o 1º acesso do funcionário provisionado pelo Owner.
    public UserBuilder WithLocalAuth(
        string username = "funcionario",
        string password = DefaultPassword,
        bool mustChangePassword = false)
    {
        _user.Username = username;
        _user.LocalAuth = new LocalAuth
        {
            UserId = _user.Id,
            PasswordHash = password == DefaultPassword
                ? DefaultPasswordHash.Value
                : BCryptNet.HashPassword(password),
            MustChangePassword = mustChangePassword,
        };
        return this;
    }

    public UserBuilder WithGoogle(string providerId = "google-sub-123")
    {
        _user.ExternalLogins.Add(new ExternalAuth
        {
            UserId = _user.Id,
            Provider = "Google",
            ProviderId = providerId,
        });
        return this;
    }

    // Vincula uma loja. O 1º vínculo criado vira o LastTenantId por padrão — é o caso comum e evita
    // que um teste sobre role acabe testando, sem querer, o fallback de "sem tenant ativo".
    public UserBuilder InTenant(Guid tenantId, UserRole role = UserRole.Owner, string fantasyName = "Minha Loja")
    {
        var tenant = new Tenant { Id = tenantId, IsActive = true };
        tenant.Settings = new TenantSettings { TenantId = tenantId, FantasyName = fantasyName };

        _user.UserTenants.Add(new UserTenant
        {
            UserId = _user.Id,
            TenantId = tenantId,
            Tenant = tenant,
            User = _user,
            Role = role,
            JoinedAt = DateTime.UtcNow,
        });

        _user.LastTenantId ??= tenantId;
        return this;
    }

    // Aponta o tenant ativo explicitamente — inclusive para um id inexistente, que é o caso de
    // fallback (LastTenantId órfão → cai no primeiro vínculo).
    public UserBuilder WithLastTenant(Guid? tenantId) { _user.LastTenantId = tenantId; return this; }

    public UserBuilder WithRefreshToken(string hashedToken, DateTime? expiry)
    {
        _user.RefreshToken = hashedToken;
        _user.RefreshTokenExpiry = expiry;
        return this;
    }

    public UserBuilder WithDeletionRequested(DateTime requestedAt, DateTime effectiveAt)
    {
        _user.AccountDeletionRequestedAt = requestedAt;
        _user.AccountDeletionEffectiveAt = effectiveAt;
        return this;
    }

    public User Build() => _user;
}
