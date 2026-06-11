namespace PDV.Application.DTOs.Users;

public record UserResponse(
    Guid Id,
    string Name,
    string Email,
    string? Phone,
    string? Document,
    DateOnly? BirthDate,
    string? ImageUrl,
    DateTime CreatedAt);
