namespace PDV.Domain.Enums;

// Estado de uma cobrança no gateway. `Failed` = tentativa de cobrança recusada numa renovação
// (webhook `subscription.payment_failed`); o gateway ainda retenta conforme a retryPolicy.
public enum PaymentStatus
{
    Pending,
    Paid,
    Failed,
    Refunded,
    Disputed,
    Expired,
    Cancelled,
}
