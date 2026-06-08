namespace PDV.Application.DTOs.Reports;

public record TopProductResponse(
    string ProductName,
    int Quantity,
    decimal Revenue);
