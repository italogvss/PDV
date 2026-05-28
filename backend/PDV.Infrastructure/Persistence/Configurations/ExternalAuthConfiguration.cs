using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class ExternalAuthConfiguration : IEntityTypeConfiguration<ExternalAuth>
{
    public void Configure(EntityTypeBuilder<ExternalAuth> builder)
    {
        builder.Property(e => e.Provider).IsRequired().HasMaxLength(50);
        builder.Property(e => e.ProviderId).IsRequired().HasMaxLength(200);

        // Garante unicidade por provedor — mesmo ProviderId não pode ter dois Users
        builder.HasIndex(e => new { e.Provider, e.ProviderId }).IsUnique();
    }
}
