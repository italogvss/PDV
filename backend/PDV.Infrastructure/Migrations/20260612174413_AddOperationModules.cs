using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOperationModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Normaliza os valores existentes (lowercase, vindos do frontend) para os nomes
            // PascalCase do enum Segment. O conversor enum→string materializa de forma
            // case-sensitive; valores nulos/desconhecidos caem em 'Outro'.
            migrationBuilder.Sql(
                """
                UPDATE `TenantSettings` SET `Segment` = CASE LOWER(`Segment`)
                    WHEN 'cafeteria'   THEN 'Cafeteria'
                    WHEN 'restaurante' THEN 'Restaurante'
                    WHEN 'mercado'     THEN 'Mercado'
                    WHEN 'varejo'      THEN 'Varejo'
                    WHEN 'farmacia'    THEN 'Farmacia'
                    WHEN 'vestuario'   THEN 'Vestuario'
                    WHEN 'eletronicos' THEN 'Eletronicos'
                    WHEN 'servicos'    THEN 'Servicos'
                    WHEN 'outro'       THEN 'Outro'
                    ELSE 'Outro'
                END;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Segment",
                table: "TenantSettings",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)",
                oldMaxLength: 50,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "EnabledModulesJson",
                table: "TenantSettings",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EnabledModulesJson",
                table: "TenantSettings");

            migrationBuilder.AlterColumn<string>(
                name: "Segment",
                table: "TenantSettings",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(50)",
                oldMaxLength: 50)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");
        }
    }
}
