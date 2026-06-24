using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.Property(e => e.UserName).IsRequired().HasMaxLength(200);
        builder.Property(e => e.UserEmail).IsRequired().HasMaxLength(300);
        builder.Property(e => e.Phone).HasMaxLength(20);
        builder.Property(e => e.ImageUrl).HasMaxLength(500);

        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Cascade (não Restrict) para permitir que a deleção do Tenant cascade corretamente:
        // Tenant → TenantRole (Cascade) → Employee (Cascade). Restrict bloquearia o MySQL
        // ao tentar deletar TenantRole enquanto Employees ainda existem.
        // A proteção contra deleção acidental de cargo-em-uso é feita na camada de serviço.
        builder.HasOne(e => e.Role)
            .WithMany(r => r.Employees)
            .HasForeignKey(e => e.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(e => e.TenantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
