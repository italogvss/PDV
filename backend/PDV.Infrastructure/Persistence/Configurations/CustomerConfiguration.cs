using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.Property(c => c.TenantId).IsRequired();
        builder.Property(c => c.Name).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Phone).HasMaxLength(20);
        builder.Property(c => c.Email).HasMaxLength(200);
        builder.Property(c => c.Document).HasMaxLength(20);
        builder.Property(c => c.Note).HasMaxLength(500).HasDefaultValue(string.Empty);

        builder.Property(c => c.AddressStreet).HasMaxLength(200);
        builder.Property(c => c.AddressNumber).HasMaxLength(10);
        builder.Property(c => c.AddressCity).HasMaxLength(100);
        builder.Property(c => c.AddressState).HasMaxLength(2);
        builder.Property(c => c.AddressZipCode).HasMaxLength(9);

        builder.HasIndex(c => c.TenantId);
        builder.HasIndex(c => new { c.TenantId, c.Name });

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(c => c.TenantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
