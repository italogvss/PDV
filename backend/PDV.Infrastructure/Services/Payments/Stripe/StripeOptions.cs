namespace PDV.Infrastructure.Services.Payments.Stripe;

public class StripeOptions
{
    public const string SectionName = "Stripe";

    // sk_test_... / sk_live_...
    public string ApiKey { get; set; } = string.Empty;

    // whsec_... — assina o corpo raw do webhook (header Stripe-Signature).
    public string WebhookSecret { get; set; } = string.Empty;

    // Tolerância, em segundos, entre o timestamp assinado e o relógio local. Protege contra replay.
    public long WebhookToleranceSeconds { get; set; } = 300;

    // Preço recorrente (`price_...`) de cada plano, indexado pelo Plan.Slug. Os ids diferem entre
    // as chaves de teste e as de produção, então eles não podem morar no código — o PlanSeeder lê
    // daqui e os grava em Plan.ExternalProductId no startup.
    //
    //   Stripe__Prices__essencial-mensal=price_...
    public Dictionary<string, string> Prices { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}
