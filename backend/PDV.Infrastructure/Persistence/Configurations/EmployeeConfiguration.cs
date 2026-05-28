using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.Property(e => e.EmployeeType).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.Position).IsRequired().HasMaxLength(100);
        builder.Property(e => e.Salary).HasColumnType("decimal(10,2)");
        builder.Property(e => e.Phone).HasMaxLength(20);
        builder.Property(e => e.AvatarUrl).HasMaxLength(500);

        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
