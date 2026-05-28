using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class ProductCategoryConfiguration : IEntityTypeConfiguration<ProductCategory>
{
    public void Configure(EntityTypeBuilder<ProductCategory> builder)
    {
        builder.Property(c => c.TenantId).IsRequired();
        builder.Property(c => c.Name).IsRequired().HasMaxLength(100);
        builder.Property(c => c.Color).IsRequired().HasMaxLength(7);

        builder.HasIndex(c => new { c.TenantId, c.Name }).IsUnique();

        builder.HasMany(c => c.Products)
               .WithOne(p => p.Category)
               .HasForeignKey(p => p.CategoryId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}
