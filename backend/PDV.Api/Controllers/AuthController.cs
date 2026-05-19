using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.DTOs.Auth;
using PDV.Application.Interfaces;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService, IConfiguration configuration) : ControllerBase
{
    [HttpGet("google")]
    public IActionResult Google()
    {
        var props = new AuthenticationProperties
        {
            RedirectUri = Url.Action(nameof(GoogleCallback), "Auth", null, Request.Scheme),
        };
        return Challenge(props, GoogleDefaults.AuthenticationScheme);
    }

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback()
    {
        var frontendUrl = configuration["Authentication:FrontendCallbackUrl"]
            ?? throw new InvalidOperationException("FrontendCallbackUrl não configurado.");

        var result = await HttpContext.AuthenticateAsync("ExternalCookie");
        if (!result.Succeeded)
            return Redirect($"{frontendUrl}?error=auth_failed");

        await HttpContext.SignOutAsync("ExternalCookie");

        var googleId = result.Principal!.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = result.Principal.FindFirstValue(ClaimTypes.Email);
        var name = result.Principal.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
        var avatar = result.Principal.FindFirstValue("urn:google:picture")
                  ?? result.Principal.FindFirstValue("picture");

        if (string.IsNullOrEmpty(googleId) || string.IsNullOrEmpty(email))
            return Redirect($"{frontendUrl}?error=auth_failed");

        var (token, _) = await authService.HandleGoogleCallbackAsync(googleId, email, name, avatar);
        return Redirect($"{frontendUrl}?token={token}");
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("pdv_token");
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await authService.GetMeAsync(userId);
        return Ok(user);
    }

    [HttpPost("tenant")]
    [Authorize]
    public async Task<IActionResult> CreateTenant([FromBody] CreateTenantRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var token = await authService.CreateTenantAsync(userId, request);
        return Ok(new TokenResponse(token));
    }

    [HttpPost("switch-tenant/{tenantId:guid}")]
    [Authorize]
    public async Task<IActionResult> SwitchTenant(Guid tenantId)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var token = await authService.SwitchTenantAsync(userId, tenantId);
        return Ok(new TokenResponse(token));
    }

    [HttpGet("tenants")]
    [Authorize]
    public async Task<IActionResult> GetTenants()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var tenants = await authService.GetUserTenantsAsync(userId);
        return Ok(tenants);
    }
}
