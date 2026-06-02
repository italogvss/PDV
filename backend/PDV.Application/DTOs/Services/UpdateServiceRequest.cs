namespace PDV.Application.DTOs.Services;

public record UpdateServiceRequest(
    string Name,
    string? Description,
    int? DurationMinutes,
    decimal Price,
    Guid? CategoryId,
    bool IsActive);
