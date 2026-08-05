using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class CreditPaymentConfiguration : IEntityTypeConfiguration<CreditPayment>
{
    public void Configure(EntityTypeBuilder<CreditPayment> builder)
    {
        builder.Property(p => p.TenantId).IsRequired();

        builder.Property(p => p.Amount).HasColumnType("decimal(10,2)").IsRequired();
        builder.Property(p => p.Method).HasConversion<string>().IsRequired().HasMaxLength(50);
        builder.Property(p => p.ReceivedAt).IsRequired();
        builder.Property(p => p.OperatorName).IsRequired().HasMaxLength(200);
        builder.Property(p => p.Note).HasMaxLength(500);

        builder.HasIndex(p => p.CreditAccountId);
        builder.HasIndex(p => p.CreditInstallmentId);

        // Índice do relatório "recebido no período".
        builder.HasIndex(p => new { p.TenantId, p.ReceivedAt });

        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(p => p.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        // SetNull: o recebimento sobrevive à exclusão do usuário que o registrou (OperatorName
        // é snapshot), mesmo tratamento de Sale.Operator.
        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(p => p.OperatorId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
