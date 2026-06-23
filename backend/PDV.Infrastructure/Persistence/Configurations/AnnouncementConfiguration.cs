using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class AnnouncementConfiguration : IEntityTypeConfiguration<Announcement>
{
    public void Configure(EntityTypeBuilder<Announcement> builder)
    {
        builder.Property(a => a.Title).IsRequired().HasMaxLength(200);
        builder.Property(a => a.Body).IsRequired().HasColumnType("longtext");
        builder.Property(a => a.Type).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.ImageUrl).HasMaxLength(500);
        builder.Property(a => a.CtaLabel).HasMaxLength(100);
        builder.Property(a => a.CtaUrl).HasMaxLength(500);
        builder.Property(a => a.TargetPlanCode).HasMaxLength(20);
        builder.Property(a => a.TargetRole).HasConversion<string>().HasMaxLength(20);

        // Índice para a varredura de avisos ativos dentro da janela de datas.
        builder.HasIndex(a => new { a.IsActive, a.PublishAt, a.ExpiresAt });
    }
}
