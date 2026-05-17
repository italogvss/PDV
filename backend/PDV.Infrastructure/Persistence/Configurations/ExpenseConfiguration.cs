using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Description).IsRequired().HasMaxLength(500);
        builder.Property(e => e.Amount).HasColumnType("decimal(10,2)").IsRequired();
        builder.Property(e => e.IsRecurring).IsRequired();
        builder.Property(e => e.DueDate).IsRequired();
        builder.Property(e => e.IsPaid).IsRequired();
        builder.Property(e => e.PaidAt);
        builder.Property(e => e.CreatedAt).IsRequired();
    }
}
