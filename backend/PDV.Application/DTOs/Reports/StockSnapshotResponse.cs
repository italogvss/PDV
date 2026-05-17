namespace PDV.Application.DTOs.Reports;

public record StockSnapshotResponse(
    Guid ProductId,
    string ProductName,
    string? Barcode,
    int Stock,
    decimal Price,
    bool IsActive);
