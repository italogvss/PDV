using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class CreditAccountConfiguration : IEntityTypeConfiguration<CreditAccount>
{
    public void Configure(EntityTypeBuilder<CreditAccount> builder)
    {
        builder.Property(a => a.TenantId).IsRequired();
        builder.HasIndex(a => a.TenantId);

        builder.Property(a => a.CustomerName).IsRequired().HasMaxLength(200);
        builder.Property(a => a.Note).HasMaxLength(500);

        builder.Property(a => a.TotalAmount).HasColumnType("decimal(10,2)").IsRequired();
        builder.Property(a => a.DownPayment).HasColumnType("decimal(10,2)").IsRequired();
        builder.Property(a => a.PaidAmount).HasColumnType("decimal(10,2)").IsRequired();

        builder.Property(a => a.InstallmentCount).IsRequired();
        builder.Property(a => a.FirstDueDate).IsRequired();
        builder.Property(a => a.Status).HasConversion<string>().IsRequired().HasMaxLength(20);

        // Uma venda tem no máximo uma conta de crediário.
        builder.HasIndex(a => a.SaleId).IsUnique();
        builder.HasIndex(a => a.CustomerId);

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(a => a.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        // Cascade: DELETE /api/sales/all limpa o histórico de vendas; sem cascade sobrariam
        // contas de crediário órfãs apontando para vendas inexistentes.
        builder.HasOne(a => a.Sale)
            .WithMany()
            .HasForeignKey(a => a.SaleId)
            .OnDelete(DeleteBehavior.Cascade);

        // Restrict: Customer usa soft delete (IsActive = false), então a FK nunca dispara —
        // é uma trava contra delete físico acidental de cliente com fiado em aberto.
        builder.HasOne(a => a.Customer)
            .WithMany()
            .HasForeignKey(a => a.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(a => a.Installments)
            .WithOne(i => i.Account)
            .HasForeignKey(i => i.CreditAccountId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
