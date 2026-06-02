namespace PDV.Application.DTOs.Services;

public record CreateServiceRequest(
    string Name,
    string? Description,
    int? DurationMinutes,
    decimal Price,
    Guid? CategoryId,
    bool IsActive = true);
