using PDV.Application.DTOs.Payments;
using PDV.Application.Interfaces.Payments;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Services.Payments.AbacatePay.Models;

namespace PDV.Infrastructure.Services.Payments.AbacatePay;

// Orquestração de negócio: traduz os modelos neutros do domínio para os payloads do AbacatePay
// (via IAbacatePayApiClient) e de volta. Implementa a interface genérica IPaymentGateway.
public class AbacatePayGateway(IAbacatePayApiClient api) : IPaymentGateway
{
    public const string ProviderName = "AbacatePay";
    public string Provider => ProviderName;

    public async Task<GatewayCustomerResult> EnsureCustomerAsync(CustomerInfo info, CancellationToken ct = default)
    {
        var body = new CreateCustomerBody(
            new CreateCustomerData(info.Email, info.Name, info.TaxId, info.Cellphone),
            info.Metadata?.ToDictionary(k => k.Key, v => v.Value));

        var customer = await api.CreateCustomerAsync(body, ct);
        return new GatewayCustomerResult(customer.Id, customer.Email ?? info.Email, customer.Name, customer.TaxId, customer.Cellphone);
    }

    public async Task<HostedCheckoutResult> CreateSubscriptionCheckoutAsync(SubscriptionCheckoutRequest request, CancellationToken ct = default)
    {
        var body = new CreateSubscriptionBody(
            Items: [new CheckoutItem(request.ProductExternalId, 1)],
            CustomerId: request.CustomerId,
            ExternalId: request.ExternalId,
            Methods: ["CARD"],
            Coupons: string.IsNullOrWhiteSpace(request.CouponCode) ? null : [request.CouponCode!],
            ReturnUrl: request.ReturnUrl,
            CompletionUrl: request.CompletionUrl,
            Metadata: request.Metadata.ToDictionary(k => k.Key, v => v.Value));

        var checkout = await api.CreateSubscriptionAsync(body, ct);
        if (string.IsNullOrEmpty(checkout.Url))
            throw new PaymentGatewayException("O gateway não retornou a URL do checkout.");

        return new HostedCheckoutResult(checkout.Id, checkout.Url!, checkout.Status ?? "PENDING");
    }

    public async Task<PixChargeResult> CreatePixChargeAsync(PixChargeRequest request, CancellationToken ct = default)
    {
        var customer = request.Customer is null
            ? null
            : new TransparentCustomer(request.Customer.Name, request.Customer.Email, request.Customer.TaxId, request.Customer.Cellphone);

        var body = new CreateTransparentBody("PIX", new CreateTransparentData(
            request.AmountCents,
            request.Description,
            request.ExpiresInSeconds,
            customer,
            request.Metadata.ToDictionary(k => k.Key, v => v.Value)));

        var pix = await api.CreateTransparentAsync(body, ct);
        return new PixChargeResult(pix.Id, pix.BrCode ?? string.Empty, pix.BrCodeBase64 ?? string.Empty, pix.Status ?? "PENDING", pix.ExpiresAt);
    }

    public async Task<PlanChangeResult> ChangeSubscriptionPlanAsync(string gatewaySubscriptionId, string newProductExternalId, int quantity, CancellationToken ct = default)
    {
        var result = await api.ChangePlanAsync(new ChangePlanBody(gatewaySubscriptionId, newProductExternalId, quantity), ct);
        return new PlanChangeResult(result.Id, result.Status ?? "PENDING", result.NewAmount ?? 0);
    }

    public Task CancelSubscriptionAsync(string gatewaySubscriptionId, CancellationToken ct = default) =>
        api.CancelSubscriptionAsync(new CancelSubscriptionBody(gatewaySubscriptionId), ct);

    public async Task<GatewayChargeStatus> GetChargeStatusAsync(string chargeId, CancellationToken ct = default)
    {
        // pix_char_... usa transparents/check; bill_... usa checkouts/get.
        var status = chargeId.StartsWith("pix", StringComparison.OrdinalIgnoreCase)
            ? await api.CheckTransparentAsync(chargeId, ct)
            : await api.GetCheckoutAsync(chargeId, ct);

        return MapStatus(status.Status);
    }

    internal static GatewayChargeStatus MapStatus(string? status) => status?.ToUpperInvariant() switch
    {
        "PAID" => GatewayChargeStatus.Paid,
        "EXPIRED" => GatewayChargeStatus.Expired,
        "CANCELLED" or "CANCELED" => GatewayChargeStatus.Cancelled,
        "REFUNDED" => GatewayChargeStatus.Refunded,
        "DISPUTED" => GatewayChargeStatus.Disputed,
        _ => GatewayChargeStatus.Pending,
    };
}
