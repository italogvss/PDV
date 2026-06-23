using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTrialTrackingAndRenewalSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Payments");

            migrationBuilder.AddColumn<bool>(
                name: "HasUsedTrial",
                table: "Users",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsRenewalScheduled",
                table: "Subscriptions",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasUsedTrial",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsRenewalScheduled",
                table: "Subscriptions");

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Payments",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");
        }
    }
}
