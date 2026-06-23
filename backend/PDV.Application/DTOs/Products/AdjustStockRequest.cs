namespace PDV.Application.DTOs.Products;

public record AdjustStockRequest(int Quantity, Guid? SupplierId = null, string? Note = null);
