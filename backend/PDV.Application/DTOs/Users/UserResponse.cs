namespace PDV.Application.DTOs.Users;

public record UserResponse(
    Guid Id,
    string Name,
    string Email,
    string? AvatarUrl,
    DateTime CreatedAt);
