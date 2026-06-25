using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.Property(u => u.Email).IsRequired().HasMaxLength(254);
        builder.Property(u => u.Username).HasMaxLength(50);
        builder.Property(u => u.Name).IsRequired().HasMaxLength(200);
        builder.Property(u => u.Phone).HasMaxLength(20);
        builder.Property(c => c.Document).HasMaxLength(20);
        builder.Property(u => u.ImageUrl).HasMaxLength(500);

        // Email deixou de ser unique global: employees podem ter o mesmo email de um owner (autenticam por username)
        builder.HasIndex(u => u.Username).IsUnique().HasFilter("Username IS NOT NULL");

        builder.HasOne(u => u.LastTenant)
            .WithMany()
            .HasForeignKey(u => u.LastTenantId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(u => u.LocalAuth)
            .WithOne(l => l.User)
            .HasForeignKey<LocalAuth>(l => l.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(u => u.ExternalLogins)
            .WithOne(e => e.User)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
