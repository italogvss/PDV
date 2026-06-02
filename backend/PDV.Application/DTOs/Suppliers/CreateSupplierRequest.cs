namespace PDV.Application.DTOs.Suppliers;

public record CreateSupplierRequest(
    string Name,
    string? Phone
);
