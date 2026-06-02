namespace PDV.Application.DTOs.Customers;

public record UpdateCustomerRequest(
    string Name,
    string? Phone,
    string? Email,
    string? Document,
    string? Note,
    CustomerAddressDto? Address
);
