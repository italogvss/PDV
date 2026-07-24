using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <summary>
    /// Migração de DADOS (sem mudança de schema): converte os códigos de plano-alvo dos anúncios
    /// para os tiers derivados do Slug do plano (ver PlanTier).
    ///
    /// Os códigos antigos vinham de uma nomenclatura que não existe mais no produto:
    ///   starter → nunca casou com ninguém (nenhum plano se chama "Starter")
    ///   pro     → casava com "Plano Profissional" por acidente ("Profissional" contém "Pro")
    ///   free    → misturava assinante do Essencial com quem não tem assinatura nenhuma
    /// </summary>
    public partial class AnnouncementPlanTargetCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE Announcements SET TargetPlanCode = 'essencial' WHERE TargetPlanCode = 'starter';");
            migrationBuilder.Sql("UPDATE Announcements SET TargetPlanCode = 'profissional' WHERE TargetPlanCode = 'pro';");
            // 'free' significava, na prática, "sem assinatura válida" — é para lá que ele vai.
            migrationBuilder.Sql("UPDATE Announcements SET TargetPlanCode = 'sem-assinatura' WHERE TargetPlanCode = 'free';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE Announcements SET TargetPlanCode = 'starter' WHERE TargetPlanCode = 'essencial';");
            migrationBuilder.Sql("UPDATE Announcements SET TargetPlanCode = 'pro' WHERE TargetPlanCode = 'profissional';");
            migrationBuilder.Sql("UPDATE Announcements SET TargetPlanCode = 'free' WHERE TargetPlanCode = 'sem-assinatura';");
        }
    }
}
