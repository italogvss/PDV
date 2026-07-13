using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PDV.Application.Interfaces;
using PDV.Application.Interfaces.Payments;
using PDV.Domain.Exceptions;
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
    // Anônimo — autenticado pela assinatura criptográfica do corpo (Stripe-Signature). A rota é
    // por provedor para não amarrar o caminho a um gateway específico.
    [AllowAnonymous]
    [HttpPost("{provider}")]
    public async Task<IActionResult> Receive(string provider)
    {
        // Lê o corpo RAW: a verificação da assinatura precisa dos bytes exatos, antes de qualquer parse.
        Request.EnableBuffering();
        string rawBody;
        using (var reader = new StreamReader(Request.Body, leaveOpen: true))
            rawBody = await reader.ReadToEndAsync();
        Request.Body.Position = 0;

        var signature = Request.Headers["Stripe-Signature"].FirstOrDefault();

        PDV.Application.DTOs.Payments.PaymentWebhookEvent evt;
        try
        {
            // Verifica a assinatura E normaliza o payload. Assinatura inválida → UnauthorizedException.
            evt = processor.Parse(rawBody, signature);
        }
        catch (UnauthorizedException ex)
        {
            logger.LogWarning("Webhook {Provider} rejeitado: {Message}", provider, ex.Message);
            return Unauthorized();
        }
        catch (Exception ex)
        {
            // Payload malformado (mas assinado) — não adianta o gateway reenviar o mesmo corpo.
            logger.LogError(ex, "Webhook {Provider} com payload inválido.", provider);
            return BadRequest();
        }

        logger.LogInformation("Webhook recebido {Provider} {EventType} {EventId}", processor.Provider, evt.RawEventType, evt.EventId);

        // Idempotência (CG-11) — evento já processado retorna 200 sem reprocessar.
        if (await repository.ProcessedEventExistsAsync(processor.Provider, evt.EventId))
        {
            logger.LogInformation("Evento já processado {EventId}", evt.EventId);
            return Ok();
        }

        try
        {
            // Aplica o estado E registra o WebhookEvent num único SaveChanges (atômico) — CG-12.
            await billingService.ProcessAsync(evt);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha ao processar webhook {EventType} {EventId}", evt.RawEventType, evt.EventId);
            // Nada foi persistido → 5xx para o gateway retentar (CG-13).
            return StatusCode(StatusCodes.Status500InternalServerError);
        }

        return Ok();
    }
}
