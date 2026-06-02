namespace PDV.Application.DTOs.Suppliers;

public record SupplierResponse(
    Guid Id,
    string Name,
    string? Phone,
    DateTime CreatedAt
);
