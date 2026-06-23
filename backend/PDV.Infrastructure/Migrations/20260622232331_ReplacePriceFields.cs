using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ReplacePriceFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PriceAnnualCents",
                table: "Plans");

            migrationBuilder.RenameColumn(
                name: "PriceMonthlyCents",
                table: "Plans",
                newName: "PriceCents");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PriceCents",
                table: "Plans",
                newName: "PriceMonthlyCents");

            migrationBuilder.AddColumn<int>(
                name: "PriceAnnualCents",
                table: "Plans",
                type: "int",
                nullable: true);
        }
    }
}
