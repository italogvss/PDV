using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class ServicePriceHistoryConfiguration : IEntityTypeConfiguration<ServicePriceHistory>
{
    public void Configure(EntityTypeBuilder<ServicePriceHistory> builder)
    {
        builder.Property(h => h.TenantId).IsRequired();
        builder.Property(h => h.ServiceName).IsRequired().HasMaxLength(200);
        builder.Property(h => h.OldPrice).HasColumnType("decimal(10,2)");
        builder.Property(h => h.NewPrice).HasColumnType("decimal(10,2)");
        builder.Property(h => h.ChangedByName).IsRequired().HasMaxLength(200);

        builder.HasOne(h => h.Service)
            .WithMany()
            .HasForeignKey(h => h.ServiceId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(h => h.ChangedByUser)
            .WithMany()
            .HasForeignKey(h => h.ChangedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(h => new { h.TenantId, h.ServiceId });
        builder.HasIndex(h => new { h.TenantId, h.CreatedAt });
    }
}
