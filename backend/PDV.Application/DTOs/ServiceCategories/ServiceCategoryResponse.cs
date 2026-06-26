namespace PDV.Application.DTOs.ServiceCategories;

public record ServiceCategoryResponse(Guid Id, string Name, string Color, DateTime UpdatedAt = default);
