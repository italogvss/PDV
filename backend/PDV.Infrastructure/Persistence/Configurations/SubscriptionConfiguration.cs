using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PDV.Domain.Entities;

namespace PDV.Infrastructure.Persistence.Configurations;

public class SubscriptionConfiguration : IEntityTypeConfiguration<Subscription>
{
    public void Configure(EntityTypeBuilder<Subscription> builder)
    {
        builder.Property(s => s.UserId).IsRequired();
        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.Method).HasConversion<string>().HasMaxLength(10);
        builder.Property(s => s.Provider).IsRequired().HasMaxLength(50);
        builder.Property(s => s.GatewaySubscriptionId).HasMaxLength(100);
        builder.Property(s => s.GatewayCustomerId).HasMaxLength(100);

        // Invariante: uma única assinatura por usuário (reaproveitada em reativação/troca de método).
        builder.HasIndex(s => s.UserId).IsUnique();
        // NULLs são distintos no MySQL — múltiplas assinaturas PIX (sem subs_) coexistem.
        builder.HasIndex(s => s.GatewaySubscriptionId).IsUnique();

        builder.HasOne(s => s.Plan)
            .WithMany()
            .HasForeignKey(s => s.PlanId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
