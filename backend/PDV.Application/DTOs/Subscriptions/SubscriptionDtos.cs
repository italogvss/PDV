namespace PDV.Application.DTOs.Subscriptions;

// Contrato HTTP de assinaturas. Planos são identificados por Id (Guid) — não há tier hardcoded.
// `PlanId == null` em SubscriptionResponse = sem assinatura válida (acesso bloqueado, sem plano Free).
// Limites: -1 = ilimitado.

public record PlanResponse(
    Guid Id,
    string Name,
    string? Description,
    decimal Price,
    // Capabilities inclusas no plano (eixo de billing): módulos + sub-features. Informativo.
    IReadOnlyList<string> Entitlements,
    IReadOnlyDictionary<string, int> Limits,
    // Ponto de entrada do trial na landing (`?plano=<slug>`) — o frontend reusa pra iniciar o
    // onboarding já com o plano certo quando o usuário escolhe na tela de planos.
    string Slug);

public record SubscriptionResponse(
    Guid? PlanId,
    string? PlanName,
    string Status,
    string? Method,
    bool IsRenewable,
    DateTime? TrialEndsAt,
    DateTime? CurrentPeriodEnd,
    DateTime? CanceledAt,
    // Prazo final para cancelar com reembolso (início da assinatura paga + janela de arrependimento).
    // null quando a assinatura nunca foi paga (trial) ou já terminou — o frontend usa para escolher
    // a mensagem de cancelamento.
    DateTime? RefundEligibleUntil,
    // Troca de plano agendada no gateway: entra em vigor em PendingPlanStartsAt (virada do ciclo).
    // Até lá valem PlanId/Entitlements atuais e nada é cobrado.
    Guid? PendingPlanId,
    string? PendingPlanName,
    DateTime? PendingPlanStartsAt,
    // Cobrança de renovação recusada e ainda em retentativa. null = nenhuma falha pendente.
    DateTime? LastPaymentFailedAt,
    int? PaymentRetryNumber,
    // Capabilities inclusas no PLANO (eixo de billing): módulos + sub-features. Informativo no
    // frontend — NÃO esconde UI; o bloqueio acontece via 402 no backend. Não confundir com os
    // módulos do tenant (/auth/me).
    IReadOnlyList<string> Entitlements,
    IReadOnlyDictionary<string, int> Limits,
    bool HasUsedTrial);

// Assinatura recorrente por cartão. ReturnUrl/CompletionUrl vêm do frontend — o backend não os
// conhece, apenas repassa ao gateway.
public record StartCheckoutRequest(
    Guid PlanId,
    string? CouponCode,
    string? ReturnUrl,
    string? CompletionUrl);

// CheckoutUrl = URL hospedada do gateway para onde o frontend redireciona.
public record StartCheckoutResponse(
    string? CheckoutUrl);

public record ChangePlanRequest(Guid PlanId);

// Resultado (ou simulação) da troca de plano. O frontend deriva a mensagem daqui, sem reimplementar
// a regra (RF-36).
//
//   Scheduled         — a troca só vale na virada do ciclo. Acontece quando o plano-alvo retira
//                       recursos OU encurta o ciclo de cobrança: nos dois casos, aplicá-la agora
//                       jogaria fora algo que o usuário já pagou.
//   EffectiveAt       — quando o plano novo passa a valer. null = agora (trial ou desistência).
//   NextChargeAt      — quando o valor do plano novo é cobrado. null no trial, que não cobra nada.
//   AmountDueNowCents — cobrado imediatamente pelo proporcional do upgrade. 0 quando não há
//                       cobrança; null quando o gateway não soube simular (só no preview).
public record ChangePlanResult(
    string PlanName,
    bool Scheduled,
    DateTime? EffectiveAt,
    DateTime? NextChargeAt,
    int? AmountDueNowCents);

// Resultado do cancelamento — o frontend deriva daqui a mensagem de confirmação.
//   Status              — estado resultante: "Expired" (trial), "RefundRequested" ou "Canceled".
//   RefundRequested     — estorno emitido; o dinheiro volta de forma assíncrona.
//   AccessUntil         — até quando o plano continua valendo; null = o acesso caiu agora.
//   DataAvailableUntil  — prazo para exportar os dados ou reassinar antes da exclusão definitiva.
public record CancelSubscriptionResult(
    string Status,
    bool RefundRequested,
    DateTime? AccessUntil,
    DateTime DataAvailableUntil);
