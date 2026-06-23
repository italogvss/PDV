using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SubscriptionFlowFixes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subscriptions_Plans_PendingPlanId",
                table: "Subscriptions");

            migrationBuilder.DropIndex(
                name: "IX_Subscriptions_PendingPlanId",
                table: "Subscriptions");

            migrationBuilder.DropIndex(
                name: "IX_Subscriptions_UserId",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "IsRenewalScheduled",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "PendingChangeExternalId",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "PendingPlanId",
                table: "Subscriptions");

            migrationBuilder.AddColumn<string>(
                name: "BillingPeriod",
                table: "Plans",
                type: "varchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "Monthly")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_UserId",
                table: "Subscriptions",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Subscriptions_UserId",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "BillingPeriod",
                table: "Plans");

            migrationBuilder.AddColumn<bool>(
                name: "IsRenewalScheduled",
                table: "Subscriptions",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PendingChangeExternalId",
                table: "Subscriptions",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<Guid>(
                name: "PendingPlanId",
                table: "Subscriptions",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_PendingPlanId",
                table: "Subscriptions",
                column: "PendingPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_UserId",
                table: "Subscriptions",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Subscriptions_Plans_PendingPlanId",
                table: "Subscriptions",
                column: "PendingPlanId",
                principalTable: "Plans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
