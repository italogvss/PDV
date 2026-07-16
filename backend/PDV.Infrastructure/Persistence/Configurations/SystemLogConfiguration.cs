using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class SystemLogConfiguration : IEntityTypeConfiguration<SystemLog>
{
    public void Configure(EntityTypeBuilder<SystemLog> builder)
    {
        builder.Property(l => l.Level).IsRequired().HasMaxLength(20);
        // Mensagem renderizada do Serilog — pode ser longa; Exception carrega a stack inteira.
        builder.Property(l => l.Message).IsRequired().HasColumnType("text");
        builder.Property(l => l.Exception).HasColumnType("text");
        builder.Property(l => l.SourceContext).HasMaxLength(300);
        builder.Property(l => l.RequestPath).HasMaxLength(300);

        // Consultas do admin: por data (timeline) e por nível dentro da data.
        builder.HasIndex(l => l.CreatedAt);
        builder.HasIndex(l => new { l.Level, l.CreatedAt });
    }
}
