using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class AppointmentServiceItemConfiguration : IEntityTypeConfiguration<AppointmentServiceItem>
{
    public void Configure(EntityTypeBuilder<AppointmentServiceItem> builder)
    {
        builder.Property(i => i.ServiceName).IsRequired().HasMaxLength(200);
        builder.Property(i => i.Price).HasColumnType("decimal(10,2)");
        builder.Property(i => i.CategoryColor).IsRequired().HasMaxLength(20);

        builder.HasOne(i => i.Appointment)
            .WithMany(a => a.ServiceItems)
            .HasForeignKey(i => i.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
