using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class PlanConfiguration : IEntityTypeConfiguration<Plan>
{
    public void Configure(EntityTypeBuilder<Plan> builder)
    {
        builder.Property(p => p.Name).IsRequired().HasMaxLength(100);
        builder.Property(p => p.Description).HasMaxLength(500);
        builder.Property(p => p.ExternalProductId).IsRequired().HasMaxLength(100);
        builder.Property(p => p.EntitledModulesJson).HasColumnType("json");
        builder.Property(p => p.LimitsJson).HasColumnType("json");
        builder.Property(p => p.BillingPeriod).HasConversion<string>().HasMaxLength(10);

        // Catálogo global — produto único por id do gateway (idempotência do seeder).
        builder.HasIndex(p => p.ExternalProductId).IsUnique();
    }
}
