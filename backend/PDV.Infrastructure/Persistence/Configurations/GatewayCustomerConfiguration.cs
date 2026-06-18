using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class GatewayCustomerConfiguration : IEntityTypeConfiguration<GatewayCustomer>
{
    public void Configure(EntityTypeBuilder<GatewayCustomer> builder)
    {
        builder.Property(c => c.UserId).IsRequired();
        builder.Property(c => c.Provider).IsRequired().HasMaxLength(50);
        builder.Property(c => c.GatewayCustomerId).IsRequired().HasMaxLength(100);
        builder.Property(c => c.Email).IsRequired().HasMaxLength(320);
        builder.Property(c => c.TaxId).HasMaxLength(20);
        builder.Property(c => c.Name).HasMaxLength(200);
        builder.Property(c => c.Cellphone).HasMaxLength(20);

        // Um cliente por usuário por provedor.
        builder.HasIndex(c => new { c.Provider, c.UserId }).IsUnique();
    }
}
