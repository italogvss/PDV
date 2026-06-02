using PDV.Application.DTOs.ServiceCategories;

namespace PDV.Application.DTOs.Services;

public record ServiceResponse(
    Guid Id,
    string Name,
    string? Description,
    int? DurationMinutes,
    decimal Price,
    bool IsActive,
    DateTime CreatedAt,
    ServiceCategoryResponse? Category);
