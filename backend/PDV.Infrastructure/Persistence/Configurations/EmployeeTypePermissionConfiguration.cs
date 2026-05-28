using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class EmployeeTypePermissionConfiguration : IEntityTypeConfiguration<EmployeeTypePermission>
{
    public void Configure(EntityTypeBuilder<EmployeeTypePermission> builder)
    {
        builder.Property(p => p.EmployeeType).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Permission).IsRequired().HasConversion<string>().HasMaxLength(50);

        // Garante que não existe duplicata de tipo+permissão por tenant
        builder.HasIndex(p => new { p.TenantId, p.EmployeeType, p.Permission }).IsUnique();
    }
}
