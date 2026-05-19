using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class TenantSettingsConfiguration : IEntityTypeConfiguration<TenantSettings>
{
    public void Configure(EntityTypeBuilder<TenantSettings> builder)
    {
        builder.HasKey(ts => ts.Id);

        builder.Property(ts => ts.CreatedAt).IsRequired();
        builder.Property(ts => ts.UpdatedAt).IsRequired();

        builder.HasOne(ts => ts.Tenant)
            .WithOne(t => t.Settings)
            .HasForeignKey<TenantSettings>(ts => ts.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(ts => ts.TenantId).IsUnique();
    }
}
