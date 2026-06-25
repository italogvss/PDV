using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class EmployeeSalaryLinkConfiguration : IEntityTypeConfiguration<EmployeeSalaryLink>
{
    public void Configure(EntityTypeBuilder<EmployeeSalaryLink> builder)
    {
        builder.HasKey(l => l.EmployeeId);

        builder.Property(l => l.TenantId).IsRequired();
        builder.Property(l => l.RecurringSeriesId).IsRequired();
        builder.Property(l => l.CreatedAt).IsRequired();

        builder.HasOne(l => l.Employee)
            .WithOne()
            .HasForeignKey<EmployeeSalaryLink>(l => l.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(l => l.TenantId);
        builder.HasIndex(l => l.RecurringSeriesId);
    }
}
