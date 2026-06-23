using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class AppointmentStatusLogConfiguration : IEntityTypeConfiguration<AppointmentStatusLog>
{
    public void Configure(EntityTypeBuilder<AppointmentStatusLog> builder)
    {
        builder.Property(l => l.TenantId).IsRequired();
        builder.Property(l => l.ChangedByName).IsRequired().HasMaxLength(200);
        builder.Property(l => l.FromStatus).HasConversion<string>().IsRequired().HasMaxLength(30);
        builder.Property(l => l.ToStatus).HasConversion<string>().IsRequired().HasMaxLength(30);

        builder.HasOne(l => l.Appointment)
            .WithMany()
            .HasForeignKey(l => l.AppointmentId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(l => l.ChangedByUser)
            .WithMany()
            .HasForeignKey(l => l.ChangedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(l => new { l.TenantId, l.AppointmentId });
        builder.HasIndex(l => new { l.TenantId, l.CreatedAt });
    }
}
