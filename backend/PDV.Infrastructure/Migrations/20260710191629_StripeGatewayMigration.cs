using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class StripeGatewayMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GatewayScheduleId",
                table: "Subscriptions",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "GatewaySyncedAt",
                table: "Subscriptions",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GatewayInvoiceId",
                table: "Payments",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GatewayScheduleId",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "GatewaySyncedAt",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "GatewayInvoiceId",
                table: "Payments");
        }
    }
}
