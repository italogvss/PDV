using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class MediaFileConfiguration : IEntityTypeConfiguration<MediaFile>
{
    public void Configure(EntityTypeBuilder<MediaFile> builder)
    {
        builder.Property(m => m.TenantId).IsRequired();
        builder.Property(m => m.EntityId).IsRequired();
        builder.Property(m => m.Category).HasConversion<string>().HasMaxLength(20);
        builder.Property(m => m.RelativePath).IsRequired().HasMaxLength(500);

        builder.HasOne(m => m.Tenant)
            .WithMany()
            .HasForeignKey(m => m.TenantId)
            .OnDelete(DeleteBehavior.Cascade);  // deleta MediaFile ao deletar Tenant

        // Uma imagem ativa por (tenant, categoria, entidade)
        builder.HasIndex(m => new { m.TenantId, m.Category, m.EntityId });
    }
}
