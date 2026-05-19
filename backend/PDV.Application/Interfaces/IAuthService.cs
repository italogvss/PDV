using PDV.Application.DTOs.Auth;

namespace PDV.Application.Interfaces;

public interface IAuthService
{
    Task<(string Token, bool HasTenants)> HandleGoogleCallbackAsync(
        string googleId, string email, string name, string? avatarUrl);
    Task<MeResponse> GetMeAsync(Guid userId);
    Task<string> CreateTenantAsync(Guid userId, CreateTenantRequest request);
    Task<string> SwitchTenantAsync(Guid userId, Guid tenantId);
    Task<IEnumerable<TenantListItem>> GetUserTenantsAsync(Guid userId);
}
