namespace PDV.Application.DTOs.Reports;

public record TopCustomerResponse(
    Guid CustomerId,
    string Name,
    int PurchaseCount,
    decimal TotalRevenue);
