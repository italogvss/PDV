namespace PDV.Application.DTOs.Customers;

public record CreateCustomerRequest(
    string Name,
    string? Phone,
    string? Email,
    string? Document,
    string? Note,
    CustomerAddressDto? Address
);
