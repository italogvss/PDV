using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentsAndUserPreferenceSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccentColor",
                table: "UserSettings",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "green")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "NotifyInvoices",
                table: "UserSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyNewSales",
                table: "UserSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyStockAlerts",
                table: "UserSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyTeamActivity",
                table: "UserSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "PaymentCardCreditEnabled",
                table: "TenantSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PaymentCardCreditFee",
                table: "TenantSettings",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "PaymentCardDebitEnabled",
                table: "TenantSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PaymentCardDebitFee",
                table: "TenantSettings",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "PaymentCashEnabled",
                table: "TenantSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PaymentCashFee",
                table: "TenantSettings",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "PaymentPixEnabled",
                table: "TenantSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PaymentPixFee",
                table: "TenantSettings",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccentColor",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "NotifyInvoices",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "NotifyNewSales",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "NotifyStockAlerts",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "NotifyTeamActivity",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "PaymentCardCreditEnabled",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "PaymentCardCreditFee",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "PaymentCardDebitEnabled",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "PaymentCardDebitFee",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "PaymentCashEnabled",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "PaymentCashFee",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "PaymentPixEnabled",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "PaymentPixFee",
                table: "TenantSettings");
        }
    }
}
