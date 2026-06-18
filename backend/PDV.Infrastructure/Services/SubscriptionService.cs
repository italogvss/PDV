using PDV.Application.DTOs.Payments;
using PDV.Application.DTOs.Subscriptions;
using PDV.Application.Helpers;
using PDV.Application.Interfaces;
using PDV.Application.Interfaces.Payments;
using PDV.Domain.Entities;
using PDV.Domain.Enums;
using PDV.Domain.Exceptions;
using PDV.Domain.Interfaces;

namespace PDV.Infrastructure.Services;

public class SubscriptionService(
    IUserContext userContext,
    IEntitlementService entitlementService,
    IPlanRepository planRepository,
    ISubscriptionRepository subscriptionRepository,
    IGatewayCustomerRepository gatewayCustomerRepository,
    IPaymentRepository paymentRepository,
    IUserRepository userRepository,
    IPaymentGateway gateway) : ISubscriptionService
{
    private const int PixExpiresInSeconds = 3600;

    public async Task<SubscriptionResponse> GetMineAsync()
    {
        var resolved = await entitlementService.ResolveForCurrentTenantAsync();
        var sub = resolved.Subscription;

        return new SubscriptionResponse(
            PlanId: sub?.PlanId,
            PlanName: sub?.Plan.Name,
            Status: sub is null ? "None" : sub.Status.ToString(),
            Method: sub?.Method.ToString(),
            IsRenewable: sub?.IsRenewable ?? false,
            TrialEndsAt: sub?.TrialEndsAt,
            CurrentPeriodEnd: sub?.CurrentPeriodEnd,
            CanceledAt: sub?.CanceledAt,
            Modules: resolved.Modules,
            Limits: resolved.Limits,
            PendingPlanId: sub?.PendingPlanId,
            PendingPlanName: sub?.PendingPlan?.Name);
    }

    public async Task<IReadOnlyList<PlanResponse>> GetPlansAsync()
    {
        var plans = await planRepository.GetActiveAsync();
        return plans.Select(MapPlan).ToList();
    }

    public async Task<StartCheckoutResponse> StartCheckoutAsync(StartCheckoutRequest request)
    {
        var userId = userContext.UserId;
        var plan = await planRepository.GetByIdAsync(request.PlanId)
            ?? throw new NotFoundException("Plano não encontrado.");
        var user = await userRepository.GetByIdAsync(userId)
            ?? throw new NotFoundException("Usuário não encontrado.");

        var method = ParseMethod(request.Method);
        var customer = await EnsureCustomerAsync(userId, user);

        // Uma assinatura por usuário — reaproveita a existente (reativação/troca de método).
        var sub = await subscriptionRepository.GetLiveByUserIdAsync(userId);
        var isNew = sub is null;
        sub ??= new Subscription { UserId = userId };
        sub.Provider = gateway.Provider;
        sub.PlanId = plan.Id;
        sub.Method = method;
        sub.GatewayCustomerId = customer.GatewayCustomerId;
        sub.Status = SubscriptionStatus.Pending;
        sub.CanceledAt = null;

        var metadata = new Dictionary<string, string>
        {
            ["userId"] = userId.ToString(),
            ["planId"] = plan.Id.ToString(),
            ["subscriptionId"] = sub.Id.ToString(),
        };

        return method == GatewayPaymentMethod.Card
            ? await StartCardCheckoutAsync(plan, sub, isNew, customer, request, metadata, userId)
            : await StartPixCheckoutAsync(plan, sub, isNew, user, request, metadata, userId);
    }

    public async Task ChangePlanAsync(ChangePlanRequest request)
    {
        var sub = await subscriptionRepository.GetLiveByUserIdAsync(userContext.UserId)
            ?? throw new BusinessException("Nenhuma assinatura ativa para trocar.");

        if (sub.Method != GatewayPaymentMethod.Card || string.IsNullOrEmpty(sub.GatewaySubscriptionId))
            throw new BusinessException("Troca de plano disponível apenas para assinaturas no cartão.");

        var newPlan = await planRepository.GetByIdAsync(request.PlanId)
            ?? throw new NotFoundException("Plano não encontrado.");

        var result = await gateway.ChangeSubscriptionPlanAsync(sub.GatewaySubscriptionId!, newPlan.ExternalProductId, 1);

        sub.PendingPlanId = newPlan.Id;
        sub.PendingChangeExternalId = result.PendingChangeId;
        await subscriptionRepository.UpdateAsync(sub);
    }

    public async Task CancelAsync()
    {
        var sub = await subscriptionRepository.GetLiveByUserIdAsync(userContext.UserId)
            ?? throw new BusinessException("Nenhuma assinatura ativa para cancelar.");

        if (sub.Method == GatewayPaymentMethod.Card && !string.IsNullOrEmpty(sub.GatewaySubscriptionId))
            await gateway.CancelSubscriptionAsync(sub.GatewaySubscriptionId!);

        sub.Status = SubscriptionStatus.Canceled;
        sub.CanceledAt = DateTime.UtcNow;
        await subscriptionRepository.UpdateAsync(sub);
    }

    private async Task<StartCheckoutResponse> StartCardCheckoutAsync(
        Plan plan, Subscription sub, bool isNew, GatewayCustomer customer,
        StartCheckoutRequest request, Dictionary<string, string> metadata, Guid userId)
    {
        if (!plan.SupportsCard)
            throw new BusinessException("Este plano não aceita pagamento por cartão.");

        sub.IsRenewable = true;
        await PersistSubscriptionAsync(sub, isNew);

        var checkout = await gateway.CreateSubscriptionCheckoutAsync(new SubscriptionCheckoutRequest(
            plan.ExternalProductId, customer.GatewayCustomerId, sub.Id.ToString(),
            request.CouponCode, request.ReturnUrl, request.CompletionUrl, metadata));

        await paymentRepository.AddAsync(new Payment
        {
            UserId = userId,
            SubscriptionId = sub.Id,
            PlanId = plan.Id,
            Provider = gateway.Provider,
            GatewayChargeId = checkout.CheckoutId,
            Kind = PaymentKind.CardSubscription,
            Method = GatewayPaymentMethod.Card,
            AmountCents = plan.PriceMonthlyCents,
            Status = PaymentStatus.Pending,
            CouponCode = request.CouponCode,
        });

        return new StartCheckoutResponse(checkout.Url, null);
    }

    private async Task<StartCheckoutResponse> StartPixCheckoutAsync(
        Plan plan, Subscription sub, bool isNew, User user,
        StartCheckoutRequest request, Dictionary<string, string> metadata, Guid userId)
    {
        if (!plan.SupportsPix)
            throw new BusinessException("Este plano não aceita pagamento por PIX.");

        var period = ParsePeriod(request.Period);
        var amount = period == BillingPeriod.Annual
            ? plan.PriceAnnualCents ?? throw new BusinessException("Período anual indisponível para este plano.")
            : plan.PriceMonthlyCents;

        sub.IsRenewable = false;
        await PersistSubscriptionAsync(sub, isNew);

        var pixMetadata = new Dictionary<string, string>(metadata) { ["period"] = period.ToString() };

        var pix = await gateway.CreatePixChargeAsync(new PixChargeRequest(
            amount,
            $"Assinatura {plan.Name} ({(period == BillingPeriod.Annual ? "anual" : "mensal")})",
            PixExpiresInSeconds,
            new CustomerInfo(user.Email, user.Name, user.Document, user.Phone),
            sub.Id.ToString(),
            pixMetadata));

        await paymentRepository.AddAsync(new Payment
        {
            UserId = userId,
            SubscriptionId = sub.Id,
            PlanId = plan.Id,
            Provider = gateway.Provider,
            GatewayChargeId = pix.ChargeId,
            Kind = PaymentKind.PixSubscription,
            Method = GatewayPaymentMethod.Pix,
            AmountCents = amount,
            Status = PaymentStatus.Pending,
        });

        return new StartCheckoutResponse(null, new PixChargeDto(pix.ChargeId, pix.BrCode, pix.BrCodeBase64, pix.ExpiresAt));
    }

    private async Task<GatewayCustomer> EnsureCustomerAsync(Guid userId, User user)
    {
        var existing = await gatewayCustomerRepository.GetByUserIdAsync(userId, gateway.Provider);
        if (existing is not null) return existing;

        var result = await gateway.EnsureCustomerAsync(new CustomerInfo(user.Email, user.Name, user.Document, user.Phone));

        var customer = new GatewayCustomer
        {
            UserId = userId,
            Provider = gateway.Provider,
            GatewayCustomerId = result.CustomerId,
            Email = result.Email,
            Name = result.Name ?? user.Name,
            TaxId = result.TaxId ?? user.Document,
            Cellphone = result.Cellphone ?? user.Phone,
        };
        await gatewayCustomerRepository.AddAsync(customer);

        // Sincroniza dados do cliente de volta no usuário (preenche o que estiver vazio).
        await SyncUserFromCustomerAsync(user, result);

        return customer;
    }

    private async Task SyncUserFromCustomerAsync(User user, GatewayCustomerResult result)
    {
        var changed = false;
        if (string.IsNullOrWhiteSpace(user.Document) && !string.IsNullOrWhiteSpace(result.TaxId))
        {
            user.Document = result.TaxId;
            changed = true;
        }
        if (string.IsNullOrWhiteSpace(user.Phone) && !string.IsNullOrWhiteSpace(result.Cellphone))
        {
            user.Phone = result.Cellphone;
            changed = true;
        }
        if (!changed) return;

        user.UpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);
    }

    private Task PersistSubscriptionAsync(Subscription sub, bool isNew) =>
        isNew ? subscriptionRepository.AddAsync(sub) : subscriptionRepository.UpdateAsync(sub);

    private static PlanResponse MapPlan(Plan p) => new(
        p.Id,
        p.Name,
        p.Description,
        p.PriceMonthlyCents / 100m,
        p.PriceAnnualCents.HasValue ? p.PriceAnnualCents.Value / 100m : null,
        OperationModuleHelper.ReadEnabled(p.ModulesJson),
        PlanJson.ReadLimits(p.LimitsJson),
        p.SupportsCard,
        p.SupportsPix,
        p.TrialDays);

    private static GatewayPaymentMethod ParseMethod(string method) => method?.ToUpperInvariant() switch
    {
        "CARD" => GatewayPaymentMethod.Card,
        "PIX" => GatewayPaymentMethod.Pix,
        _ => throw new BusinessException("Método de pagamento inválido."),
    };

    private static BillingPeriod ParsePeriod(string? period) =>
        string.Equals(period, "Annual", StringComparison.OrdinalIgnoreCase) ? BillingPeriod.Annual : BillingPeriod.Monthly;
}
