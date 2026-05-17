using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PDV.Application.DTOs.Auth;
using PDV.Application.Interfaces;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class AuthService(
    IUserRepository userRepository,
    IValidator<LoginRequest> validator,
    IConfiguration configuration) : IAuthService
{
    public async Task<(LoginResponse User, string Token)> LoginAsync(LoginRequest request)
    {
        await validator.ValidateAndThrowAsync(request);

        var user = await userRepository.GetByUsernameAsync(request.UserName)
            ?? throw new UnauthorizedException("E-mail ou senha inválidos.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("E-mail ou senha inválidos.");

        var token = GenerateToken(user.Id, user.Name, user.Role.ToString());
        var response = new LoginResponse(user.Id, user.Name, user.Username, user.Role.ToString());

        return (response, token);
    }

    public async Task<LoginResponse> GetMeAsync(Guid userId)
    {
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        return new LoginResponse(user.Id, user.Name, user.Username, user.Role.ToString());
    }

    private string GenerateToken(Guid userId, string name, string role)
    {
        var secret = configuration["JWT_SECRET"]
            ?? throw new InvalidOperationException("JWT_SECRET não configurado.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresHours = int.TryParse(configuration["JWT_EXPIRES_HOURS"], out var h) ? h : 8;

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Name, name),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiresHours),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
