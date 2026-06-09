using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantOperationSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowDiscounts",
                table: "TenantSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AutoOpen",
                table: "TenantSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "BarcodeReader",
                table: "TenantSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "CashFundAmount",
                table: "TenantSettings",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountLimitPercent",
                table: "TenantSettings",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "InactivityLockMinutes",
                table: "TenantSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "RequireManagerCancel",
                table: "TenantSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "RequireOperator",
                table: "TenantSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowDiscounts",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "AutoOpen",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "BarcodeReader",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "CashFundAmount",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "DiscountLimitPercent",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "InactivityLockMinutes",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "RequireManagerCancel",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "RequireOperator",
                table: "TenantSettings");
        }
    }
}
