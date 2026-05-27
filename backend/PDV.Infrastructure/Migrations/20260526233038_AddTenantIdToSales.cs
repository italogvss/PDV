using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantIdToSales : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Sales",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "IX_Sales_TenantId",
                table: "Sales",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sales_TenantId",
                table: "Sales");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Sales");
        }
    }
}
