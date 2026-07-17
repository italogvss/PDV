using PDV.Application.Helpers;
using PDV.Domain.Constants;
using PDV.Domain.Entities;
using PDV.Domain.Enums;

namespace PDV.UnitTests.Support.Builders;

// Object mother do Plan. Entitlements e limites são JSON no banco — construí-los via PlanJson (o
// mesmo helper da produção) garante que o teste exercita a serialização real, inclusive a
// normalização para lowercase, em vez de um JSON escrito à mão que poderia divergir.
public sealed class PlanBuilder
{
    private readonly Plan _plan = new()
    {
        Id = Guid.NewGuid(),
        Name = "Essencial Mensal",
        Slug = "essencial-mensal",
        PriceCents = 2999,
        ExternalProductId = "price_test_essencial_mensal",
        BillingPeriod = BillingPeriod.Monthly,
        IsActive = true,
    };

    private readonly List<string> _entitlements = [];
    private readonly Dictionary<string, int> _limits = [];

    // Essencial: todos os módulos, nenhuma feature; 2 funcionários, 1 loja.
    public static PlanBuilder Essential() =>
        new PlanBuilder()
            .WithEntitlements([.. EntitlementCatalog.Modules])
            .WithLimit(PlanLimits.Employees, 2)
            .WithLimit(PlanLimits.Stores, 1);

    // Profissional: módulos + todas as features; funcionários ilimitados, 5 lojas.
    public static PlanBuilder Professional() =>
        new PlanBuilder()
            .Named("Profissional Mensal", "profissional-mensal", 4999)
            .WithEntitlements([.. EntitlementCatalog.Modules, .. EntitlementCatalog.Features])
            .WithLimit(PlanLimits.Employees, PlanLimits.Unlimited)
            .WithLimit(PlanLimits.Stores, 5);

    // Plano sem nada concedido — usado para provar que "vazio = nenhuma capability" no eixo de plano
    // (oposto do eixo de tenant, onde vazio = todos os módulos).
    public static PlanBuilder Empty() => new();

    public PlanBuilder Named(string name, string slug, int priceCents)
    {
        _plan.Name = name;
        _plan.Slug = slug;
        _plan.PriceCents = priceCents;
        return this;
    }

    public PlanBuilder Annual()
    {
        _plan.BillingPeriod = BillingPeriod.Annual;
        return this;
    }

    public PlanBuilder WithEntitlements(params string[] keys)
    {
        _entitlements.AddRange(keys);
        return this;
    }

    public PlanBuilder WithLimit(string key, int value)
    {
        _limits[key] = value;
        return this;
    }

    public Plan Build()
    {
        _plan.EntitledModulesJson = PlanJson.SerializeEntitlements(_entitlements);
        _plan.LimitsJson = PlanJson.SerializeLimits(_limits);
        return _plan;
    }
}
