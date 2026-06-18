using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.Interfaces;
using PDV.Application.Interfaces.Payments;
using PDV.Domain.Entities;
using PDV.Domain.Interfaces;

namespace PDV.Api.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhooksController(
    IPaymentWebhookProcessor processor,
    IBillingWebhookService billingService,
    IBillingWebhookRepository repository,
    ILogger<WebhooksController> logger) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("abacatepay")]
    public async Task<IActionResult> AbacatePay([FromQuery] string? webhookSecret)
    {
        // 1. Secret na URL — valida antes de qualquer processamento.
        if (!processor.VerifySecret(webhookSecret))
            return Unauthorized();

        // 2. Lê o corpo raw (necessário para o HMAC) sem deixar o binding consumi-lo.
        Request.EnableBuffering();
        string rawBody;
        using (var reader = new StreamReader(Request.Body, leaveOpen: true))
            rawBody = await reader.ReadToEndAsync();
        Request.Body.Position = 0;

        // 3. Assinatura HMAC do corpo.
        var signature = Request.Headers["X-Webhook-Signature"].FirstOrDefault();
        if (!processor.VerifySignature(rawBody, signature))
            return StatusCode(StatusCodes.Status403Forbidden);

        var evt = processor.Parse(rawBody);

        // 4. Idempotência — evento já processado retorna 200 sem reprocessar.
        if (await repository.ProcessedEventExistsAsync(processor.Provider, evt.EventId))
            return Ok();

        try
        {
            await billingService.ProcessAsync(evt);
            await repository.RecordEventAsync(new WebhookEvent
            {
                Provider = processor.Provider,
                EventId = evt.EventId,
                EventType = evt.RawEventType,
                ProcessedAt = DateTime.UtcNow,
                Status = "Processed",
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha ao processar webhook {EventType} {EventId}", evt.RawEventType, evt.EventId);
            // Não registra como Processed → permite reprocessar numa retentativa do gateway.
            return StatusCode(StatusCodes.Status500InternalServerError);
        }

        return Ok();
    }
}
