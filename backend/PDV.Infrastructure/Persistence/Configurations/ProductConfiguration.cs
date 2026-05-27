using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.TenantId).IsRequired();
        builder.Property(p => p.Name).IsRequired().HasMaxLength(200);
        builder.Property(p => p.Barcode).HasMaxLength(50);
        builder.Property(p => p.NCM).HasMaxLength(10);
        builder.Property(p => p.Price).HasColumnType("decimal(10,2)");
        builder.Property(p => p.PurchasePrice).HasColumnType("decimal(10,2)");
        builder.Property(p => p.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(p => p.CreatedAt).IsRequired();

        // Código de barras único por tenant
        builder.HasIndex(p => new { p.TenantId, p.Barcode }).IsUnique();

    }
}
