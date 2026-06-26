namespace PDV.Application.DTOs.Customers;

public record CustomerCrmStatsResponse(
    int TotalSales,
    decimal TotalSpent,
    decimal AverageTicket,
    DateTime? LastPurchaseDate,
    string? PreferredPaymentMethod,
    IEnumerable<CustomerTopProductDto> TopProducts,
    IEnumerable<CustomerRecentSaleDto> RecentSales,
    CustomerAppointmentCountsDto AppointmentCounts,
    CustomerNextAppointmentDto? NextAppointment,
    IEnumerable<CustomerTopServiceDto> TopServices
);

public record CustomerTopProductDto(string ProductName, int Quantity, decimal TotalSpent, int MaxQuantity);

public record CustomerRecentSaleDto(
    Guid Id,
    string ShortId,
    string ItemsSummary,
    string PaymentMethod,
    decimal Total,
    DateTime CreatedAt
);

public record CustomerAppointmentCountsDto(int Total, int Completed, int Cancelled, int InProgress);

public record CustomerNextAppointmentDto(
    Guid Id,
    DateTime Start,
    IEnumerable<string> ServiceNames,
    string EmployeeName,
    string Status
);

public record CustomerTopServiceDto(string ServiceName, int Count, int MaxCount);
