using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class LocalAuthConfiguration : IEntityTypeConfiguration<LocalAuth>
{
    public void Configure(EntityTypeBuilder<LocalAuth> builder)
    {
        builder.Property(l => l.PasswordHash).IsRequired().HasMaxLength(500);

        builder.HasIndex(l => l.UserId).IsUnique();
    }
}
