using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class SaleConfiguration : IEntityTypeConfiguration<Sale>
{
    public void Configure(EntityTypeBuilder<Sale> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.PaymentMethod).IsRequired().HasMaxLength(50);
        builder.Property(s => s.CustomerName).HasMaxLength(200);
        builder.Property(s => s.Total).HasColumnType("decimal(10,2)");
        builder.Property(s => s.AmountPaid).HasColumnType("decimal(10,2)");
        builder.Property(s => s.InstallmentValue).HasColumnType("decimal(10,2)");
        builder.Property(s => s.Status).HasConversion<string>().IsRequired().HasMaxLength(20);
        builder.Property(s => s.CreatedAt).IsRequired();

        builder.HasOne(s => s.Operator)
            .WithMany()
            .HasForeignKey(s => s.OperatorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.CancelledBy)
            .WithMany()
            .HasForeignKey(s => s.CancelledById)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
