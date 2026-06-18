namespace PDV.Domain.Enums;

// Método de cobrança de assinatura. Separado de `PaymentMethod` (que é do PDV de vendas).
public enum GatewayPaymentMethod
{
    Card,
    Pix,
}
