namespace PDV.Application.DTOs.Users;

public record UserResponse(
    Guid Id,
    string Name,
    string Username,
    string Role,
    DateTime CreatedAt);
