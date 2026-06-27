using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NotificationPrefsRefactor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NotifyTeamActivity",
                table: "UserSettings");

            migrationBuilder.AddColumn<bool>(
                name: "NotifyAppointments",
                table: "UserSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NotifyAppointments",
                table: "UserSettings");

            migrationBuilder.AddColumn<bool>(
                name: "NotifyTeamActivity",
                table: "UserSettings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);
        }
    }
}
