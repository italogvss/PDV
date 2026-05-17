namespace PDV.Application.DTOs.Auth;

public record LoginResponse(Guid Id, string Name, string Email, string Role);
