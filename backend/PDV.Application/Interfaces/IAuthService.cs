using PDV.Application.DTOs.Auth;

namespace PDV.Application.Interfaces;

public interface IAuthService
{
    Task<(string AccessToken, string RefreshToken)> LoginWithGoogleAsync(
        string credential);
    Task<(string AccessToken, string RefreshToken)> LoginWithLocalAsync(string username, string password);
    Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
    Task<MeResponse> GetMeAsync(Guid userId, string role, Guid? tenantId);
    Task<string> SwitchTenantAsync(Guid userId, Guid tenantId);
    Task<IEnumerable<TenantListItem>> GetUserTenantsAsync(Guid userId);
    Task<(string AccessToken, string RefreshToken)> RefreshAsync(string refreshToken);
    Task LogoutAsync(Guid userId);
}
