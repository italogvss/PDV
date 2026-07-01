using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class ServiceProductConfiguration : IEntityTypeConfiguration<ServiceProduct>
{
    public void Configure(EntityTypeBuilder<ServiceProduct> builder)
    {
        builder.HasKey(sp => sp.Id);

        builder.Property(sp => sp.Quantity)
            .IsRequired()
            .HasDefaultValue(1);

        builder.HasOne(sp => sp.Service)
            .WithMany(s => s.ServiceProducts)
            .HasForeignKey(sp => sp.ServiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(sp => sp.Product)
            .WithMany()
            .HasForeignKey(sp => sp.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(sp => new { sp.ServiceId, sp.ProductId }).IsUnique();
    }
}
