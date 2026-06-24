using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.Property(l => l.TenantId).IsRequired();
        builder.Property(l => l.Action).HasConversion<string>().IsRequired().HasMaxLength(40);
        builder.Property(l => l.EntityType).HasConversion<string>().IsRequired().HasMaxLength(30);
        builder.Property(l => l.EntityName).IsRequired().HasMaxLength(200);
        builder.Property(l => l.PerformedByName).IsRequired().HasMaxLength(200);
        builder.Property(l => l.DetailsJson).HasColumnType("json");

        // Índices para as consultas mais comuns: por entidade e por data.
        builder.HasIndex(l => new { l.TenantId, l.EntityType, l.EntityId });
        builder.HasIndex(l => new { l.TenantId, l.CreatedAt });
    }
}
