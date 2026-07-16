using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class AccessLogConfiguration : IEntityTypeConfiguration<AccessLog>
{
    public void Configure(EntityTypeBuilder<AccessLog> builder)
    {
        builder.Property(a => a.UserId).IsRequired();
        builder.Property(a => a.Event).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.IpAddress).HasMaxLength(45);   // comporta IPv6
        builder.Property(a => a.UserAgent).HasMaxLength(512);

        builder.HasIndex(a => a.UserId);
        builder.HasIndex(a => a.CreatedAt); // varredura por prazo de retenção (6 meses)
    }
}
