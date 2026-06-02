namespace PDV.Application.DTOs.Suppliers;

public record UpdateSupplierRequest(
    string Name,
    string? Phone
);
