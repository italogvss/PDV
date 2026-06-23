using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.Property(p => p.UserId).IsRequired();
        builder.Property(p => p.Provider).IsRequired().HasMaxLength(50);
        builder.Property(p => p.GatewayChargeId).IsRequired().HasMaxLength(100);
        builder.Property(p => p.Kind).HasConversion<string>().HasMaxLength(30);
        builder.Property(p => p.Method).HasConversion<string>().HasMaxLength(10);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.CouponCode).HasMaxLength(50);
        builder.Property(p => p.ReceiptUrl).HasMaxLength(500);
        builder.Property(p => p.CardLastFour).HasMaxLength(4);
        builder.Property(p => p.CardBrand).HasMaxLength(20);

        builder.HasIndex(p => p.UserId);
        builder.HasIndex(p => p.GatewayChargeId);
    }
}
