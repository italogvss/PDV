using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using PDV.Domain.Exceptions;
using PDV.Infrastructure.Services.Payments.AbacatePay.Models;

namespace PDV.Infrastructure.Services.Payments.AbacatePay;

// HttpClient tipado. BaseAddress + header Authorization são configurados no DI (Program.cs).
// Desserializa o envelope { data, success, error } e lança PaymentGatewayException com a
// mensagem de erro do AbacatePay. Retry leve para falhas transientes (5xx/timeout/429).
public class AbacatePayApiClient(HttpClient http) : IAbacatePayApiClient
{
    private const int MaxAttempts = 3;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public Task<AbacateCustomer> CreateCustomerAsync(CreateCustomerBody body, CancellationToken ct = default) =>
        SendAsync<AbacateCustomer>(HttpMethod.Post, "customers/create", body, ct);

    public Task<AbacateCheckout> CreateSubscriptionAsync(CreateSubscriptionBody body, CancellationToken ct = default) =>
        SendAsync<AbacateCheckout>(HttpMethod.Post, "subscriptions/create", body, ct);

    public Task<AbacateTransparent> CreateTransparentAsync(CreateTransparentBody body, CancellationToken ct = default) =>
        SendAsync<AbacateTransparent>(HttpMethod.Post, "transparents/create", body, ct);

    public Task<AbacatePlanChange> ChangePlanAsync(ChangePlanBody body, CancellationToken ct = default) =>
        SendAsync<AbacatePlanChange>(HttpMethod.Post, "subscriptions/change-plan", body, ct);

    public Task<AbacateSubscription> CancelSubscriptionAsync(CancelSubscriptionBody body, CancellationToken ct = default) =>
        SendAsync<AbacateSubscription>(HttpMethod.Post, "subscriptions/cancel", body, ct);

    public Task<AbacateChargeStatus> GetCheckoutAsync(string id, CancellationToken ct = default) =>
        SendAsync<AbacateChargeStatus>(HttpMethod.Get, $"checkouts/get?id={Uri.EscapeDataString(id)}", null, ct);

    public Task<AbacateChargeStatus> CheckTransparentAsync(string id, CancellationToken ct = default) =>
        SendAsync<AbacateChargeStatus>(HttpMethod.Get, $"transparents/check?id={Uri.EscapeDataString(id)}", null, ct);

    public Task<AbacateChargeStatus> SimulatePixPaymentAsync(string pixChargeId, CancellationToken ct = default) =>
        SendAsync<AbacateChargeStatus>(HttpMethod.Get, $"pixQrCode/simulate?id={Uri.EscapeDataString(pixChargeId)}", null, ct);

    private async Task<TRes> SendAsync<TRes>(HttpMethod method, string path, object? body, CancellationToken ct)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                using var request = new HttpRequestMessage(method, path);
                if (body is not null)
                    request.Content = JsonContent.Create(body, body.GetType(), options: Json);

                using var response = await http.SendAsync(request, ct);
                var raw = await response.Content.ReadAsStringAsync(ct);

                if (!response.IsSuccessStatusCode)
                {
                    if (IsTransient(response.StatusCode) && attempt < MaxAttempts)
                    {
                        await BackoffAsync(attempt, ct);
                        continue;
                    }

                    throw new PaymentGatewayException(
                        "Falha na comunicação com o gateway de pagamentos.",
                        ExtractError(raw) ?? $"HTTP {(int)response.StatusCode}.");
                }

                var envelope = JsonSerializer.Deserialize<AbacateEnvelope<TRes>>(raw, Json);
                if (envelope is null || !envelope.Success || envelope.Error is not null || envelope.Data is null)
                    throw new PaymentGatewayException(
                        "O gateway de pagamentos retornou um erro.",
                        ErrorToString(envelope?.Error) ?? "Resposta inválida do gateway.");

                return envelope.Data;
            }
            catch (HttpRequestException) when (attempt < MaxAttempts)
            {
                await BackoffAsync(attempt, ct);
            }
            catch (TaskCanceledException) when (!ct.IsCancellationRequested && attempt < MaxAttempts)
            {
                await BackoffAsync(attempt, ct);
            }
        }
    }

    private static bool IsTransient(HttpStatusCode status) =>
        status is HttpStatusCode.RequestTimeout or HttpStatusCode.TooManyRequests || (int)status >= 500;

    private static Task BackoffAsync(int attempt, CancellationToken ct) =>
        Task.Delay(TimeSpan.FromMilliseconds(200 * attempt), ct);

    private static string? ExtractError(string raw)
    {
        try
        {
            var envelope = JsonSerializer.Deserialize<AbacateEnvelope<JsonElement>>(raw, Json);
            return ErrorToString(envelope?.Error);
        }
        catch
        {
            return null;
        }
    }

    private static string? ErrorToString(JsonElement? error)
    {
        if (error is null) return null;
        var element = error.Value;
        return element.ValueKind == JsonValueKind.String ? element.GetString() : element.ToString();
    }
}
