using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class TenantSettingsConfiguration : IEntityTypeConfiguration<TenantSettings>
{
    public void Configure(EntityTypeBuilder<TenantSettings> builder)
    {
        builder.Property(ts => ts.FantasyName).IsRequired().HasMaxLength(200);
        builder.Property(ts => ts.CompanyName).HasMaxLength(300);
        builder.Property(ts => ts.Cnpj).HasMaxLength(14);
        builder.Property(ts => ts.StateRegistration).HasMaxLength(50);
        builder.Property(ts => ts.Segment).HasMaxLength(50);
        builder.Property(ts => ts.Phone).HasMaxLength(20);
        builder.Property(ts => ts.LogoUrl).HasMaxLength(500);

        builder.Property(ts => ts.AddressCep).HasMaxLength(8);
        builder.Property(ts => ts.AddressStreet).HasMaxLength(200);
        builder.Property(ts => ts.AddressNumber).HasMaxLength(20);
        builder.Property(ts => ts.AddressComplement).HasMaxLength(100);
        builder.Property(ts => ts.AddressNeighborhood).HasMaxLength(100);
        builder.Property(ts => ts.AddressCity).HasMaxLength(100);
        builder.Property(ts => ts.AddressState).HasMaxLength(2);

        builder.Property(ts => ts.BusinessHoursJson).HasColumnType("longtext");
        builder.Property(ts => ts.TaxRegime).IsRequired().HasMaxLength(20).HasDefaultValue("simples");

        builder.Property(ts => ts.DiscountLimitPercent).HasColumnType("decimal(5,2)");

        builder.Property(ts => ts.PaymentPixEnabled).HasDefaultValue(true);
        builder.Property(ts => ts.PaymentCardCreditEnabled).HasDefaultValue(true);
        builder.Property(ts => ts.PaymentCardDebitEnabled).HasDefaultValue(true);
        builder.Property(ts => ts.PaymentCashEnabled).HasDefaultValue(true);
        builder.Property(ts => ts.PaymentPixFee).HasColumnType("decimal(5,2)");
        builder.Property(ts => ts.PaymentCardCreditFee).HasColumnType("decimal(5,2)");
        builder.Property(ts => ts.PaymentCardDebitFee).HasColumnType("decimal(5,2)");
        builder.Property(ts => ts.PaymentCashFee).HasColumnType("decimal(5,2)");

        builder.HasOne(ts => ts.Tenant)
            .WithOne(t => t.Settings)
            .HasForeignKey<TenantSettings>(ts => ts.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(ts => ts.TenantId).IsUnique();
    }
}
