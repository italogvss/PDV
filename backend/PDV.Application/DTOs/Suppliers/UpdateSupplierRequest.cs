namespace PDV.Application.DTOs.Suppliers;

public record UpdateSupplierRequest(
    string Name,
    string? Phone,
    string? Email,
    string? Document,
    string? AddressStreet,
    string? AddressNumber,
    string? AddressCity,
    string? AddressState,
    string? AddressZipCode
);
