using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class ProductPriceHistoryConfiguration : IEntityTypeConfiguration<ProductPriceHistory>
{
    public void Configure(EntityTypeBuilder<ProductPriceHistory> builder)
    {
        builder.Property(h => h.TenantId).IsRequired();
        builder.Property(h => h.ProductName).IsRequired().HasMaxLength(200);
        builder.Property(h => h.OldPrice).HasColumnType("decimal(10,2)");
        builder.Property(h => h.NewPrice).HasColumnType("decimal(10,2)");
        builder.Property(h => h.ChangedByName).IsRequired().HasMaxLength(200);

        builder.HasOne(h => h.Product)
            .WithMany()
            .HasForeignKey(h => h.ProductId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(h => h.ChangedByUser)
            .WithMany()
            .HasForeignKey(h => h.ChangedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(h => new { h.TenantId, h.ProductId });
        builder.HasIndex(h => new { h.TenantId, h.CreatedAt });
    }
}
