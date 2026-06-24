using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> builder)
    {
        builder.Property(a => a.TenantId).IsRequired();
        builder.Property(a => a.CustomerName).IsRequired().HasMaxLength(200);
        builder.Property(a => a.CustomerPhone).HasMaxLength(30);
        builder.Property(a => a.EmployeeName).IsRequired().HasMaxLength(200);
        builder.Property(a => a.Price).HasColumnType("decimal(10,2)");
        builder.Property(a => a.Note).HasMaxLength(1000);
        builder.Property(a => a.Color).HasMaxLength(20);
        builder.Property(a => a.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasOne(a => a.Customer)
            .WithMany()
            .HasForeignKey(a => a.CustomerId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(a => a.Employee)
            .WithMany()
            .HasForeignKey(a => a.EmployeeId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(a => a.ServiceItems)
            .WithOne(i => i.Appointment)
            .HasForeignKey(i => i.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(a => new { a.TenantId, a.EmployeeId, a.Start });

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(a => a.TenantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
