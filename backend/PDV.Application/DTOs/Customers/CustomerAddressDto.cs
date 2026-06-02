namespace PDV.Application.DTOs.Customers;

public record CustomerAddressDto(
    string? Street,
    string? Number,
    string? City,
    string? State,
    string? ZipCode
);
