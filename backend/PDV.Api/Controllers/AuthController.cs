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
public class AuthController(IAuthService authService) : ControllerBase
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
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await authService.LogoutAsync(userId);
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
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await authService.GetMeAsync(userId);
        return Ok(user);
    }

    [HttpPost("switch-tenant/{tenantId:guid}")]
    [Authorize]
    public async Task<IActionResult> SwitchTenant(Guid tenantId)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var token = await authService.SwitchTenantAsync(userId, tenantId);
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
        var (accessToken, refreshToken) = await authService.LoginWithLocalAsync(request.Email, request.Password);
        SetAuthCookies(accessToken, refreshToken);
        return Ok();
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);
        return NoContent();
    }
}
