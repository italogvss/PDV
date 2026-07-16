using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class AccountDeletionConfiguration : IEntityTypeConfiguration<AccountDeletion>
{
    public void Configure(EntityTypeBuilder<AccountDeletion> builder)
    {
        builder.Property(a => a.UserId).IsRequired();
        builder.Property(a => a.Scope).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.Path).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.TenantIdsJson).HasColumnType("json");
        builder.Property(a => a.CategoriesJson).HasColumnType("json");

        builder.HasIndex(a => a.UserId);
        builder.HasIndex(a => a.Status);
    }
}
