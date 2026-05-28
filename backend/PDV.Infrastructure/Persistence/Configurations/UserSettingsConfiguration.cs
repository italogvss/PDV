using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class UserSettingsConfiguration : IEntityTypeConfiguration<UserSettings>
{
    public void Configure(EntityTypeBuilder<UserSettings> builder)
    {
        builder.Property(us => us.Theme).IsRequired().HasConversion<string>().HasMaxLength(20);

        builder.HasOne(us => us.User)
            .WithOne(u => u.Settings)
            .HasForeignKey<UserSettings>(us => us.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(us => us.UserId).IsUnique();
    }
}
