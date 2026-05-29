using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixIsActiveDefaults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // RefactorBaseEntityAndAuth usou defaultValue: false para IsActive nas tabelas existentes.
            // Registros pré-existentes ficaram com IsActive = false, o que impede o funcionamento correto.
            // Aqui corrigimos todos os registros existentes para IsActive = true.
            migrationBuilder.Sql("UPDATE Users SET IsActive = 1 WHERE IsActive = 0");
            migrationBuilder.Sql("UPDATE UserSettings SET IsActive = 1 WHERE IsActive = 0");
            migrationBuilder.Sql("UPDATE TenantSettings SET IsActive = 1 WHERE IsActive = 0");
            migrationBuilder.Sql("UPDATE Sales SET IsActive = 1 WHERE IsActive = 0");
            migrationBuilder.Sql("UPDATE Expenses SET IsActive = 1 WHERE IsActive = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE Users SET IsActive = 0");
            migrationBuilder.Sql("UPDATE UserSettings SET IsActive = 0");
            migrationBuilder.Sql("UPDATE TenantSettings SET IsActive = 0");
            migrationBuilder.Sql("UPDATE Sales SET IsActive = 0");
            migrationBuilder.Sql("UPDATE Expenses SET IsActive = 0");
        }
    }
}
