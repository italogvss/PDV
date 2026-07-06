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
    int? TrialDays,
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

// Resultado do cancelamento. AccessRevoked = true quando o acesso caiu na hora (cancelamento em
// trial: assinatura removida + loja(s) desativada(s)) → o frontend desloga e vai para a landing.
// false quando a assinatura ativa foi cancelada mas o acesso segue até o fim do período pago.
public record CancelSubscriptionResult(bool AccessRevoked);
