using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DropPlanPaymentMethodAndDisplayOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DisplayOrder",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "SupportsCard",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "SupportsPix",
                table: "Plans");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DisplayOrder",
                table: "Plans",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "SupportsCard",
                table: "Plans",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SupportsPix",
                table: "Plans",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }
    }
}
