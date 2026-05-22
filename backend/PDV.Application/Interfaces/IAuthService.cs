using PDV.Application.DTOs.Auth;

namespace PDV.Application.Interfaces;

public interface IAuthService
{
    Task<(string AccessToken, string RefreshToken, bool HasTenants)> LoginWithGoogleAsync(
        string credential);
    Task<MeResponse> GetMeAsync(Guid userId);
    Task<string> CreateTenantAsync(Guid userId, CreateTenantRequest request);
    Task<string> SwitchTenantAsync(Guid userId, Guid tenantId);
    Task<IEnumerable<TenantListItem>> GetUserTenantsAsync(Guid userId);
    Task<(string AccessToken, string RefreshToken)> RefreshAsync(string refreshToken);
    Task LogoutAsync(Guid userId);
}
