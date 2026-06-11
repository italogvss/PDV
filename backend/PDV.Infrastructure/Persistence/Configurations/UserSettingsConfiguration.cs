using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class UserSettingsConfiguration : IEntityTypeConfiguration<UserSettings>
{
    public void Configure(EntityTypeBuilder<UserSettings> builder)
    {
        builder.Property(us => us.Theme).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(us => us.AccentColor).IsRequired().HasMaxLength(20).HasDefaultValue("green");

        builder.Property(us => us.NotifyNewSales).HasDefaultValue(true);
        builder.Property(us => us.NotifyStockAlerts).HasDefaultValue(true);
        builder.Property(us => us.NotifyInvoices).HasDefaultValue(true);
        builder.Property(us => us.NotifyTeamActivity).HasDefaultValue(true);

        builder.HasOne(us => us.User)
            .WithOne(u => u.Settings)
            .HasForeignKey<UserSettings>(us => us.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(us => us.UserId).IsUnique();
    }
}
