using PDV.Domain.Entities;
using PDV.Domain.Enums;

namespace PDV.UnitTests.Support.Builders;

// Object mother da Subscription. Cada named constructor é um estado da máquina de estados de
// docs/subscriptions.md §11 — nomear os estados evita que um teste monte, sem perceber, uma
// combinação impossível (ex.: Trialing com StartedAt preenchido).
public sealed class SubscriptionBuilder
{
    private readonly Subscription _sub = new()
    {
        Id = Guid.NewGuid(),
        UserId = Guid.NewGuid(),
        IsActive = true,
    };

    private SubscriptionBuilder(Plan plan)
    {
        _sub.Plan = plan;
        _sub.PlanId = plan.Id;
    }

    // Trial PDV-side: não toca o gateway, logo sem Provider, sem sub_/cus_, e nunca foi paga
    // (StartedAt null → fora de qualquer janela de reembolso).
    public static SubscriptionBuilder Trialing(Plan? plan = null, int daysLeft = 30) =>
        new(plan ?? PlanBuilder.Essential().Build())
        {
            _sub =
            {
                Status = SubscriptionStatus.Trialing,
                IsRenewable = false,
                Provider = string.Empty,
                TrialEndsAt = DateTime.UtcNow.AddDays(daysLeft),
                CurrentPeriodEnd = DateTime.UtcNow.AddDays(daysLeft),
            },
        };

    // Assinatura paga e vigente. `startedDaysAgo` posiciona a janela de arrependimento de 7 dias:
    // 3 → dentro (cancelar estorna), 40 → fora (cancelar só encerra no fim do período).
    public static SubscriptionBuilder Active(Plan? plan = null, int startedDaysAgo = 3, int periodDaysLeft = 27) =>
        new(plan ?? PlanBuilder.Essential().Build())
        {
            _sub =
            {
                Status = SubscriptionStatus.Active,
                IsRenewable = true,
                Provider = "Stripe",
                GatewaySubscriptionId = "sub_test_123",
                GatewayCustomerId = "cus_test_123",
                StartedAt = DateTime.UtcNow.AddDays(-startedDaysAgo),
                CurrentPeriodEnd = DateTime.UtcNow.AddDays(periodDaysLeft),
            },
        };

    // Cancelada mas ainda dentro do período pago — continua com direito ao plano (contraintuitivo,
    // e exatamente por isso vale um teste): cancelar só interrompe as próximas faturas.
    public static SubscriptionBuilder Canceled(Plan? plan = null, int periodDaysLeft = 10) =>
        new(plan ?? PlanBuilder.Essential().Build())
        {
            _sub =
            {
                Status = SubscriptionStatus.Canceled,
                Provider = "Stripe",
                StartedAt = DateTime.UtcNow.AddDays(-40),
                CurrentPeriodEnd = DateTime.UtcNow.AddDays(periodDaysLeft),
                CanceledAt = DateTime.UtcNow.AddDays(-1),
            },
        };

    public static SubscriptionBuilder Expired(Plan? plan = null) =>
        new(plan ?? PlanBuilder.Essential().Build())
        {
            _sub =
            {
                Status = SubscriptionStatus.Expired,
                Provider = "Stripe",
                CurrentPeriodEnd = DateTime.UtcNow.AddDays(-5),
            },
        };

    public static SubscriptionBuilder Pending(Plan? plan = null) =>
        new(plan ?? PlanBuilder.Essential().Build())
        {
            _sub = { Status = SubscriptionStatus.Pending, Provider = "Stripe" },
        };

    // Estorno emitido, aguardando o webhook confirmar. Bloqueia novo checkout e o pedido de exclusão.
    public static SubscriptionBuilder RefundRequested(Plan? plan = null) =>
        new(plan ?? PlanBuilder.Essential().Build())
        {
            _sub =
            {
                Status = SubscriptionStatus.RefundRequested,
                Provider = "Stripe",
                StartedAt = DateTime.UtcNow.AddDays(-3),
                CurrentPeriodEnd = DateTime.UtcNow,
                CanceledAt = DateTime.UtcNow,
            },
        };

    public SubscriptionBuilder OwnedBy(Guid userId) { _sub.UserId = userId; return this; }

    public SubscriptionBuilder WithTrialEnd(DateTime? trialEndsAt) { _sub.TrialEndsAt = trialEndsAt; return this; }

    public SubscriptionBuilder WithPeriodEnd(DateTime? periodEnd) { _sub.CurrentPeriodEnd = periodEnd; return this; }

    public SubscriptionBuilder WithStartedAt(DateTime? startedAt) { _sub.StartedAt = startedAt; return this; }

    public SubscriptionBuilder WithPendingPlan(Plan pendingPlan)
    {
        _sub.PendingPlanId = pendingPlan.Id;
        _sub.GatewayScheduleId = "sub_sched_test_123";
        return this;
    }

    public Subscription Build() => _sub;
}
