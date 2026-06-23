using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class StockMovementConfiguration : IEntityTypeConfiguration<StockMovement>
{
    public void Configure(EntityTypeBuilder<StockMovement> builder)
    {
        builder.Property(m => m.TenantId).IsRequired();
        builder.Property(m => m.ProductName).IsRequired().HasMaxLength(200);
        builder.Property(m => m.Type).HasConversion<string>().IsRequired().HasMaxLength(30);
        builder.Property(m => m.UnitCost).HasColumnType("decimal(10,2)");
        builder.Property(m => m.SupplierName).HasMaxLength(200);
        builder.Property(m => m.Note).HasMaxLength(500);
        builder.Property(m => m.CreatedByName).IsRequired().HasMaxLength(200);

        builder.HasOne(m => m.Product)
            .WithMany()
            .HasForeignKey(m => m.ProductId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(m => m.Supplier)
            .WithMany()
            .HasForeignKey(m => m.SupplierId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(m => m.CreatedByUser)
            .WithMany()
            .HasForeignKey(m => m.CreatedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(m => new { m.TenantId, m.ProductId });
        builder.HasIndex(m => new { m.TenantId, m.CreatedAt });
    }
}
