using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class CreditInstallmentConfiguration : IEntityTypeConfiguration<CreditInstallment>
{
    public void Configure(EntityTypeBuilder<CreditInstallment> builder)
    {
        builder.Property(i => i.TenantId).IsRequired();

        builder.Property(i => i.Number).IsRequired();
        builder.Property(i => i.DueDate).IsRequired();
        builder.Property(i => i.Amount).HasColumnType("decimal(10,2)").IsRequired();
        builder.Property(i => i.PaidAmount).HasColumnType("decimal(10,2)").IsRequired();
        builder.Property(i => i.PaidAt);
        builder.Property(i => i.Status).HasConversion<string>().IsRequired().HasMaxLength(20);

        builder.HasIndex(i => i.CreditAccountId);

        // Índice do filtro mais usado da tela: parcelas vencidas / a vencer por período.
        builder.HasIndex(i => new { i.TenantId, i.Status, i.DueDate });

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(i => i.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(i => i.Payments)
            .WithOne(p => p.Installment)
            .HasForeignKey(p => p.CreditInstallmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
