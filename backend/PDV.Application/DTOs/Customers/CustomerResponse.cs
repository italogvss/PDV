namespace PDV.Application.DTOs.Customers;

public record CustomerResponse(
    Guid Id,
    string Name,
    string? Phone,
    string? Email,
    string? Document,
    string Note,
    CustomerAddressDto? Address,
    DateTime CreatedAt
);
