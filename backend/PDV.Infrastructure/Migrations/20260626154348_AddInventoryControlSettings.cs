using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryControlSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DefaultCriticalStock",
                table: "TenantSettings",
                type: "int",
                nullable: false,
                defaultValue: 2);

            migrationBuilder.AddColumn<int>(
                name: "DefaultMinStock",
                table: "TenantSettings",
                type: "int",
                nullable: false,
                defaultValue: 5);

            migrationBuilder.AddColumn<bool>(
                name: "InventoryControlEnabled",
                table: "TenantSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "StockFieldsEditable",
                table: "TenantSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultCriticalStock",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "DefaultMinStock",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "InventoryControlEnabled",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "StockFieldsEditable",
                table: "TenantSettings");
        }
    }
}
