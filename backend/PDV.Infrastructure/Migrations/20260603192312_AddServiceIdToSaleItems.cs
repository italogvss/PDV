using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceIdToSaleItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ServiceId",
                table: "SaleItems",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "IX_SaleItems_ServiceId",
                table: "SaleItems",
                column: "ServiceId");

            migrationBuilder.AddForeignKey(
                name: "FK_SaleItems_Services_ServiceId",
                table: "SaleItems",
                column: "ServiceId",
                principalTable: "Services",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SaleItems_Services_ServiceId",
                table: "SaleItems");

            migrationBuilder.DropIndex(
                name: "IX_SaleItems_ServiceId",
                table: "SaleItems");

            migrationBuilder.DropColumn(
                name: "ServiceId",
                table: "SaleItems");
        }
    }
}
