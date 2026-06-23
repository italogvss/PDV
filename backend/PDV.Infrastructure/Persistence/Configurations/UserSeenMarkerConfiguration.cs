using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class UserSeenMarkerConfiguration : IEntityTypeConfiguration<UserSeenMarker>
{
    public void Configure(EntityTypeBuilder<UserSeenMarker> builder)
    {
        builder.Property(m => m.UserId).IsRequired();
        builder.Property(m => m.Key).IsRequired().HasMaxLength(100);

        // Invariante: um usuário vê cada Key uma única vez.
        builder.HasIndex(m => new { m.UserId, m.Key }).IsUnique();
    }
}
