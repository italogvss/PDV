using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SubscriptionRefundAndRetention : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TrialDays",
                table: "Plans");

            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAt",
                table: "Subscriptions",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RetryNumber",
                table: "Payments",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StartedAt",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "RetryNumber",
                table: "Payments");

            migrationBuilder.AddColumn<int>(
                name: "TrialDays",
                table: "Plans",
                type: "int",
                nullable: true);
        }
    }
}
