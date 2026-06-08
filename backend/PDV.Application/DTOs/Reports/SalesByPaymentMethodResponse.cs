namespace PDV.Application.DTOs.Reports;

public record SalesByPaymentMethodResponse(
    string PaymentMethod,
    decimal Total,
    int Count);
