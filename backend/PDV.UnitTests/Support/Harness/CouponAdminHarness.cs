using Moq;
using PDV.Application.DTOs.Payments;
using PDV.Application.Interfaces;
using PDV.Application.Interfaces.Payments;
using PDV.Infrastructure.Services;

namespace PDV.UnitTests.Support.Harness;

// Monta o AdminService só para a fatia de Cupons. Os três métodos (GetCoupons/CreateCoupon/
// DeactivateCoupon) nunca tocam o AppDbContext — o Stripe é a única fonte da verdade, sem
// entidade local — por isso o `context` concreto do construtor pode ser null aqui. Testar o
// resto do AdminService, que usa banco de verdade, fica fora deste projeto (mesma linha de
// AccountDeletionHarness sobre serviços com AppDbContext concreto).
public sealed class CouponAdminHarness
{
    public Mock<IPaymentGateway> Gateway { get; } = new();

    public CouponAdminHarness WithCoupons(params CouponResult[] coupons)
    {
        Gateway.Setup(g => g.ListCouponsAsync(It.IsAny<CancellationToken>())).ReturnsAsync(coupons.ToList());
        return this;
    }

    public CouponAdminHarness WhenCreateReturns(CouponResult result)
    {
        Gateway.Setup(g => g.CreateCouponAsync(It.IsAny<CreateCouponRequest>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync(result);
        return this;
    }

    public IAdminService Build() => new AdminService(null!, Gateway.Object);
}
