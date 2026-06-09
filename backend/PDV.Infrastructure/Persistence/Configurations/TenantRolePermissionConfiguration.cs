using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class TenantRolePermissionConfiguration : IEntityTypeConfiguration<TenantRolePermission>
{
    public void Configure(EntityTypeBuilder<TenantRolePermission> builder)
    {
        builder.HasKey(p => new { p.TenantRoleId, p.Permission });

        builder.Property(p => p.Permission).IsRequired().HasConversion<string>().HasMaxLength(50);
    }
}
