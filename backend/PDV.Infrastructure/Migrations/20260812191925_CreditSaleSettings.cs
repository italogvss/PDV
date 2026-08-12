using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CreditSaleSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CreditFirstDueDays",
                table: "TenantSettings",
                type: "int",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.AddColumn<int>(
                name: "CreditMaxInstallments",
                table: "TenantSettings",
                type: "int",
                nullable: false,
                defaultValue: 12);

            migrationBuilder.AddColumn<decimal>(
                name: "CreditMinDownPaymentPercent",
                table: "TenantSettings",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreditFirstDueDays",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "CreditMaxInstallments",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "CreditMinDownPaymentPercent",
                table: "TenantSettings");
        }
    }
}
