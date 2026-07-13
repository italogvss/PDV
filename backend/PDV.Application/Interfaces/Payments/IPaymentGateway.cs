using PDV.Application.DTOs.Payments;

namespace PDV.Application.Interfaces.Payments;

// Interface genérica de gateway de pagamentos. A orquestração de assinatura fala apenas com
// esta abstração — trocar de provedor = nova implementação, sem tocar nos serviços de negócio.
//
// O trial (30 dias) NÃO aparece aqui: ele é PDV-side e o gateway nunca é acionado durante ele.
public interface IPaymentGateway
{
    string Provider { get; }

    Task<GatewayCustomerResult> EnsureCustomerAsync(CustomerInfo info, CancellationToken ct = default);

    // Assinatura recorrente por cartão — devolve a URL do checkout hospedado. A ativação só
    // acontece por webhook (RF-17); esta resposta nunca ativa nada.
    Task<HostedCheckoutResult> CreateSubscriptionCheckoutAsync(SubscriptionCheckoutRequest request, CancellationToken ct = default);

    // Upgrade: troca o preço agora e cobra a diferença proporcional na hora. A assinatura não pode
    // ter agendamento anexado — libere-o antes (ReleaseScheduleAsync).
    Task<PlanUpgradeResult> UpgradeSubscriptionAsync(string gatewaySubscriptionId, string newPriceExternalId, CancellationToken ct = default);

    // Simula o upgrade acima sem cobrar nada — alimenta o diálogo de confirmação (RF-37).
    Task<PlanUpgradePreview> PreviewUpgradeAsync(string gatewaySubscriptionId, string newPriceExternalId, CancellationToken ct = default);

    // Downgrade: agenda a troca para a virada do ciclo. O preço vigente (e, portanto, o que o
    // usuário já pagou) fica intacto até lá — nada é cobrado nem creditado agora (RF-6/RF-31).
    // Idempotente: reagendar sobrescreve o agendamento existente.
    Task<PlanDowngradeResult> ScheduleDowngradeAsync(string gatewaySubscriptionId, string newPriceExternalId, CancellationToken ct = default);

    // Desfaz o agendamento; a assinatura volta a ser gerida diretamente, no preço vigente (RF-35).
    Task ReleaseScheduleAsync(string scheduleId, CancellationToken ct = default);

    Task CancelSubscriptionAsync(string gatewaySubscriptionId, CancellationToken ct = default);

    // Emite o estorno de uma cobrança (CG-7). É assíncrono: o desfecho chega pelo webhook de
    // estorno, que é quem revoga o acesso (RF-41).
    Task<RefundResult> RefundAsync(string chargeReference, CancellationToken ct = default);

    // O preço existe, está ativo e é recorrente? Guarda o checkout contra um catálogo dessincronizado.
    Task<bool> PriceExistsAsync(string priceExternalId, CancellationToken ct = default);
}
