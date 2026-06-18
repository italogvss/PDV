using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class WebhookEventConfiguration : IEntityTypeConfiguration<WebhookEvent>
{
    public void Configure(EntityTypeBuilder<WebhookEvent> builder)
    {
        builder.Property(e => e.Provider).IsRequired().HasMaxLength(50);
        builder.Property(e => e.EventId).IsRequired().HasMaxLength(100);
        builder.Property(e => e.EventType).IsRequired().HasMaxLength(60);
        builder.Property(e => e.Status).IsRequired().HasMaxLength(20);
        builder.Property(e => e.Error).HasColumnType("longtext");

        // Idempotência: um evento por (provedor, id do evento).
        builder.HasIndex(e => new { e.Provider, e.EventId }).IsUnique();
    }
}
