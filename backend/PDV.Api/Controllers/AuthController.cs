using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.Auth;
using PDV.Application.Interfaces;
using PDV.Domain.Exceptions;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService, IUserContext userContext) : ControllerBase
{
    private static readonly bool IsProduction =
        string.Equals(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"), "Production",
            StringComparison.OrdinalIgnoreCase);

    [HttpPost("google")]
    public async Task<IActionResult> Google([FromBody] GoogleLoginRequest request)
    {
        var (accessToken, refreshToken) =
            await authService.LoginWithGoogleAsync(request.Credential);

        SetAuthCookies(accessToken, refreshToken);
        return Ok();
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        if (!Request.Cookies.TryGetValue("refresh_token", out var refreshToken))
            return Unauthorized();

        try
        {
            var (accessToken, newRefreshToken) = await authService.RefreshAsync(refreshToken);
            SetAuthCookies(accessToken, newRefreshToken);
            return Ok();
        }
        catch (UnauthorizedException)
        {
            ExpireAuthCookies();
            return Unauthorized();
        }
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await authService.LogoutAsync(userContext.UserId);
        ExpireAuthCookies();
        return Ok();
    }

    private void SetAuthCookies(string accessToken, string refreshToken)
    {
        var accessOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = IsProduction,
            SameSite = SameSiteMode.Strict,
            MaxAge = TimeSpan.FromHours(8),
        };
        var refreshOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = IsProduction,
            SameSite = SameSiteMode.Strict,
            MaxAge = TimeSpan.FromDays(30),
        };

        Response.Cookies.Append("access_token", accessToken, accessOptions);
        Response.Cookies.Append("refresh_token", refreshToken, refreshOptions);
    }

    private void ExpireAuthCookies()
    {
        var expired = new CookieOptions { MaxAge = TimeSpan.Zero };
        Response.Cookies.Append("access_token", "", expired);
        Response.Cookies.Append("refresh_token", "", expired);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        Guid? tenantId = Guid.TryParse(User.FindFirstValue("tenantId"), out var tid) ? tid : null;
        var user = await authService.GetMeAsync(userContext.UserId, role, tenantId);
        return Ok(user);
    }

    [HttpPost("switch-tenant/{tenantId:guid}")]
    [Authorize]
    public async Task<IActionResult> SwitchTenant(Guid tenantId)
    {
        var token = await authService.SwitchTenantAsync(userContext.UserId, tenantId);
        Response.Cookies.Append("access_token", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = IsProduction,
            SameSite = SameSiteMode.Strict,
            MaxAge = TimeSpan.FromHours(8),
        });
        return NoContent();
    }

    [HttpPost("local")]
    public async Task<IActionResult> Local([FromBody] LocalLoginRequest request)
    {
        var (accessToken, refreshToken) = await authService.LoginWithLocalAsync(request.Username, request.Password);
        SetAuthCookies(accessToken, refreshToken);
        return Ok();
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var accessToken = await authService.ChangePasswordAsync(
            userContext.UserId, request.CurrentPassword, request.NewPassword);

        // Reemite o access_token já sem o claim mustChangePassword, liberando o enforcement na hora.
        Response.Cookies.Append("access_token", accessToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = IsProduction,
            SameSite = SameSiteMode.Strict,
            MaxAge = TimeSpan.FromHours(8),
        });
        return NoContent();
    }
}
