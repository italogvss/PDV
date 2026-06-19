namespace PDV.Infrastructure.Services.Payments.AbacatePay;

public class AbacatePayOptions
{
    public const string SectionName = "AbacatePay";

    public string ApiKey { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.abacatepay.com/v2";

    // Legado — o returnUrl agora vem do frontend. Mantido apenas como fallback opcional.
    public string? BackUrl { get; set; }
}
