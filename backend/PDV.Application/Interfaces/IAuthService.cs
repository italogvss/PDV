using PDV.Application.DTOs.Auth;

namespace PDV.Application.Interfaces;

public interface IAuthService
{
    Task<(LoginResponse User, string Token)> LoginAsync(LoginRequest request);
    Task<LoginResponse> GetMeAsync(Guid userId);
}
