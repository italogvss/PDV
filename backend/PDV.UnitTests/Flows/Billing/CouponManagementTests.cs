using Moq;
using PDV.Application.DTOs.Admin;
using PDV.Application.DTOs.Payments;
using PDV.Application.Interfaces.Payments;
using PDV.Domain.Exceptions;
using PDV.UnitTests.Support.Harness;

namespace PDV.UnitTests.Flows.Billing;

// Fluxo: o admin da plataforma cria/lista/desativa cupons de desconto — telas /admin/cupons.
// Sem entidade local: o Stripe é a única fonte da verdade (Coupon + Promotion Code), então o que
// importa testar é a tradução DTO admin ↔ DTO neutro do gateway e as regras que impedem mandar
// uma combinação inválida pro Stripe.
[TestFixture]
public class CouponManagementTests
{
    private static AdminCreateCouponRequest PercentRequest(
        decimal? percentOff = 30, int? amountOffCents = null, string duration = "once", int? durationInMonths = null) =>
        new("TRIAL30", "Desconto pós-trial", percentOff, amountOffCents, duration, durationInMonths, MaxRedemptions: null, ExpiresAt: null);

    private static CouponResult ResultFor(AdminCreateCouponRequest r) => new(
        PromotionCodeId: "promo_123",
        CouponId: "coupon_abc",
        Code: r.Code,
        Name: r.Name,
        PercentOff: r.PercentOff,
        AmountOffCents: r.AmountOffCents,
        Duration: r.Duration,
        DurationInMonths: r.DurationInMonths,
        MaxRedemptions: r.MaxRedemptions,
        TimesRedeemed: 0,
        ExpiresAt: r.ExpiresAt,
        Active: true,
        CreatedAt: DateTime.UtcNow);

    // ── Validação: uma combinação inválida nunca pode chegar ao Stripe ─────────────────────────

    [Test]
    public void CreateCoupon_WithoutCode_ThrowsBusinessException()
    {
        var harness = new CouponAdminHarness();
        var request = PercentRequest() with { Code = "" };

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CreateCouponAsync(request));
    }

    [Test]
    public void CreateCoupon_WithoutAnyDiscount_ThrowsBusinessException()
    {
        var harness = new CouponAdminHarness();
        var request = PercentRequest(percentOff: null, amountOffCents: null);

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build().CreateCouponAsync(request));
        Assert.That(ex.Message, Does.Contain("percentual OU um valor fixo"));
    }

    // Ambíguo pro Stripe: CouponCreateOptions só aceita um dos dois — mandar os dois quebraria lá,
    // não aqui, e com uma mensagem de erro pior.
    [Test]
    public void CreateCoupon_WithBothPercentAndAmount_ThrowsBusinessException()
    {
        var harness = new CouponAdminHarness();
        var request = PercentRequest(percentOff: 30, amountOffCents: 1000);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CreateCouponAsync(request));
    }

    [Test]
    public void CreateCoupon_WithInvalidDuration_ThrowsBusinessException()
    {
        var harness = new CouponAdminHarness();
        var request = PercentRequest(duration: "eventually");

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CreateCouponAsync(request));
    }

    // "repeating" sem dizer por quantos meses deixaria o Stripe rejeitar a chamada (ou pior, aceitar
    // um duration_in_months nulo e se comportar de menira inesperada).
    [Test]
    public void CreateCoupon_RepeatingWithoutDurationInMonths_ThrowsBusinessException()
    {
        var harness = new CouponAdminHarness();
        var request = PercentRequest(duration: "repeating", durationInMonths: null);

        var ex = Assert.ThrowsAsync<BusinessException>(() => harness.Build().CreateCouponAsync(request));
        Assert.That(ex.Message, Does.Contain("meses"));
    }

    [Test]
    public void CreateCoupon_InvalidRequest_NeverReachesTheGateway()
    {
        var harness = new CouponAdminHarness();
        var request = PercentRequest(percentOff: null, amountOffCents: null);

        Assert.ThrowsAsync<BusinessException>(() => harness.Build().CreateCouponAsync(request));

        harness.Gateway.Verify(g => g.CreateCouponAsync(
            It.IsAny<CreateCouponRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Caminho feliz: request admin → request neutro do gateway → DTO de volta ────────────────

    [Test]
    public async Task CreateCoupon_WithPercentOff_ForwardsExactRequestToTheGateway()
    {
        var harness = new CouponAdminHarness();
        var request = PercentRequest(percentOff: 30);
        harness.WhenCreateReturns(ResultFor(request));

        await harness.Build().CreateCouponAsync(request);

        harness.Gateway.Verify(g => g.CreateCouponAsync(
            It.Is<CreateCouponRequest>(r =>
                r.Code == "TRIAL30" && r.PercentOff == 30 && r.AmountOffCents == null && r.Duration == "once"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task CreateCoupon_WithAmountOff_ForwardsExactRequestToTheGateway()
    {
        var harness = new CouponAdminHarness();
        var request = PercentRequest(percentOff: null, amountOffCents: 1500);
        harness.WhenCreateReturns(ResultFor(request));

        await harness.Build().CreateCouponAsync(request);

        harness.Gateway.Verify(g => g.CreateCouponAsync(
            It.Is<CreateCouponRequest>(r => r.PercentOff == null && r.AmountOffCents == 1500),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task CreateCoupon_Repeating_ForwardsDurationInMonths()
    {
        var harness = new CouponAdminHarness();
        var request = PercentRequest(duration: "repeating", durationInMonths: 3);
        harness.WhenCreateReturns(ResultFor(request));

        await harness.Build().CreateCouponAsync(request);

        harness.Gateway.Verify(g => g.CreateCouponAsync(
            It.Is<CreateCouponRequest>(r => r.Duration == "repeating" && r.DurationInMonths == 3),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    // A resposta que o admin vê é o que o Stripe devolveu (id do promotion code, id do coupon),
    // não um eco do request — é assim que a tela sabe o `promotionCodeId` pra desativar depois.
    [Test]
    public async Task CreateCoupon_ReturnsTheGatewayGeneratedIds()
    {
        var harness = new CouponAdminHarness();
        var request = PercentRequest();
        harness.WhenCreateReturns(ResultFor(request) with { PromotionCodeId = "promo_xyz", CouponId = "coupon_xyz" });

        var dto = await harness.Build().CreateCouponAsync(request);

        Assert.Multiple(() =>
        {
            Assert.That(dto.PromotionCodeId, Is.EqualTo("promo_xyz"));
            Assert.That(dto.CouponId, Is.EqualTo("coupon_xyz"));
        });
    }

    // ── Listagem: o Stripe é lido, não um cache local ───────────────────────────────────────────

    [Test]
    public async Task GetCoupons_ReturnsGatewayResultsMappedFieldByField()
    {
        var result = new CouponResult(
            PromotionCodeId: "promo_1", CouponId: "coupon_1", Code: "BLACKFRIDAY", Name: "Black Friday",
            PercentOff: 50, AmountOffCents: null, Duration: "once", DurationInMonths: null,
            MaxRedemptions: 100, TimesRedeemed: 7, ExpiresAt: new DateTime(2026, 12, 1), Active: true,
            CreatedAt: new DateTime(2026, 1, 1));
        var harness = new CouponAdminHarness().WithCoupons(result);

        var list = await harness.Build().GetCouponsAsync();

        Assert.That(list, Has.Count.EqualTo(1));
        var dto = list[0];
        Assert.Multiple(() =>
        {
            Assert.That(dto.PromotionCodeId, Is.EqualTo("promo_1"));
            Assert.That(dto.Code, Is.EqualTo("BLACKFRIDAY"));
            Assert.That(dto.PercentOff, Is.EqualTo(50));
            Assert.That(dto.MaxRedemptions, Is.EqualTo(100));
            Assert.That(dto.TimesRedeemed, Is.EqualTo(7));
            Assert.That(dto.Active, Is.True);
        });
    }

    [Test]
    public async Task GetCoupons_WhenStripeHasNone_ReturnsEmptyList()
    {
        var harness = new CouponAdminHarness().WithCoupons();

        var list = await harness.Build().GetCouponsAsync();

        Assert.That(list, Is.Empty);
    }

    // ── Desativação: o Promotion Code não pode ser deletado no Stripe, só desativado ───────────

    [Test]
    public async Task DeactivateCoupon_ForwardsThePromotionCodeIdToTheGateway()
    {
        var harness = new CouponAdminHarness();

        await harness.Build().DeactivateCouponAsync("promo_123");

        harness.Gateway.Verify(g => g.DeactivateCouponAsync("promo_123", It.IsAny<CancellationToken>()), Times.Once);
    }
}
