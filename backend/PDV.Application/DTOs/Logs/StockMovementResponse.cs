namespace PDV.Application.DTOs.Logs;

public record StockMovementResponse(
    Guid Id,
    Guid? ProductId,
    string ProductName,
    string Type,
    int Quantity,
    decimal? UnitCost,
    Guid? SupplierId,
    string? SupplierName,
    string? Note,
    Guid? CreatedByUserId,
    string CreatedByName,
    DateTime CreatedAt);
