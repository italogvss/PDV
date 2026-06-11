namespace PDV.Application.DTOs.Users;

public record UpdateUserRequest(string Name, string? Phone, string? Document, DateOnly? BirthDate);
