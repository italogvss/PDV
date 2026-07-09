namespace PDV.Domain.Constants;

// Checkout iniciado (Subscription/Payment em Pending) e nunca confirmado pelo gateway — o usuário
// abandonou o pagamento. Depois desse prazo, a varredura horária libera a assinatura para nova
// tentativa (Expired não bloqueia checkout) e cancela a cobrança pendente órfã no histórico.
public static class CheckoutDefaults
{
    public const int PendingTtlHours = 24;
}
