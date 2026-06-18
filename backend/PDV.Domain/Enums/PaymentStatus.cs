namespace PDV.Domain.Enums;

// Estado de uma cobrança no gateway.
public enum PaymentStatus
{
    Pending,
    Paid,
    Refunded,
    Disputed,
    Expired,
    Cancelled,
}
