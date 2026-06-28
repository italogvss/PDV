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
    IEnumerable<CustomerTopServiceDto> TopServices,
    IEnumerable<CustomerMonthlySpendDto> MonthlySpend,
    IEnumerable<CustomerCategorySliceDto> ProductCategories,
    IEnumerable<CustomerCategorySliceDto> ServiceCategories
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

// Month no formato "yyyy-MM"; série contínua (meses sem compra vêm com Total = 0).
public record CustomerMonthlySpendDto(string Month, decimal Total);

public record CustomerCategorySliceDto(string Name, decimal Total);
