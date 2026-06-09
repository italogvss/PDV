using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS `EmployeeTypePermissions`");

            // Compatível com MySQL < 8.0.26 — verifica via information_schema antes de dropar
            migrationBuilder.Sql(@"
                SET @exists = (
                    SELECT COUNT(1)
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Employees'
                      AND COLUMN_NAME = 'EmployeeType'
                );
                SET @sql = IF(@exists > 0, 'ALTER TABLE `Employees` DROP COLUMN `EmployeeType`', 'SELECT 1');
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");

            // Adiciona RoleId apenas se ainda não existir
            migrationBuilder.Sql(@"
                SET @exists = (
                    SELECT COUNT(1)
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Employees'
                      AND COLUMN_NAME = 'RoleId'
                );
                SET @sql = IF(@exists = 0,
                    'ALTER TABLE `Employees` ADD `RoleId` char(36) COLLATE ascii_general_ci NOT NULL DEFAULT ''00000000-0000-0000-0000-000000000000''',
                    'SELECT 1');
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");

            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS `TenantRoles` (
                    `Id` char(36) COLLATE ascii_general_ci NOT NULL,
                    `TenantId` char(36) COLLATE ascii_general_ci NOT NULL,
                    `Name` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
                    `Description` varchar(255) CHARACTER SET utf8mb4 NULL,
                    `IsDefault` tinyint(1) NOT NULL DEFAULT 0,
                    `IsActive` tinyint(1) NOT NULL DEFAULT 1,
                    `CreatedAt` datetime(6) NOT NULL,
                    `UpdatedAt` datetime(6) NOT NULL,
                    CONSTRAINT `PK_TenantRoles` PRIMARY KEY (`Id`)
                ) CHARACTER SET=utf8mb4;
            ");

            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS `TenantRolePermissions` (
                    `TenantRoleId` char(36) COLLATE ascii_general_ci NOT NULL,
                    `Permission` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
                    CONSTRAINT `PK_TenantRolePermissions` PRIMARY KEY (`TenantRoleId`, `Permission`),
                    CONSTRAINT `FK_TenantRolePermissions_TenantRoles_TenantRoleId`
                        FOREIGN KEY (`TenantRoleId`) REFERENCES `TenantRoles` (`Id`) ON DELETE CASCADE
                ) CHARACTER SET=utf8mb4;
            ");

            // Cria índice apenas se ainda não existir
            migrationBuilder.Sql(@"
                SET @exists = (
                    SELECT COUNT(1)
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Employees'
                      AND INDEX_NAME = 'IX_Employees_RoleId'
                );
                SET @sql = IF(@exists = 0, 'CREATE INDEX `IX_Employees_RoleId` ON `Employees`(`RoleId`)', 'SELECT 1');
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");

            migrationBuilder.Sql(@"
                SET @exists = (
                    SELECT COUNT(1)
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'TenantRoles'
                      AND INDEX_NAME = 'IX_TenantRoles_TenantId_Name'
                );
                SET @sql = IF(@exists = 0,
                    'CREATE UNIQUE INDEX `IX_TenantRoles_TenantId_Name` ON `TenantRoles`(`TenantId`, `Name`)',
                    'SELECT 1');
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");

            // Remove dados de dev sem RoleId válido (e seus dependentes) — migração anterior à refatoração de roles
            migrationBuilder.Sql(@"
                DELETE FROM Appointments
                WHERE EmployeeId IN (
                    SELECT Id FROM Employees WHERE RoleId = '00000000-0000-0000-0000-000000000000'
                );
                DELETE FROM Employees WHERE RoleId = '00000000-0000-0000-0000-000000000000';
            ");

            // Adiciona FK apenas se ainda não existir
            migrationBuilder.Sql(@"
                SET @exists = (
                    SELECT COUNT(1)
                    FROM information_schema.TABLE_CONSTRAINTS
                    WHERE CONSTRAINT_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Employees'
                      AND CONSTRAINT_NAME = 'FK_Employees_TenantRoles_RoleId'
                );
                SET @sql = IF(@exists = 0,
                    'ALTER TABLE `Employees` ADD CONSTRAINT `FK_Employees_TenantRoles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `TenantRoles` (`Id`) ON DELETE RESTRICT',
                    'SELECT 1');
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Employees_TenantRoles_RoleId",
                table: "Employees");

            migrationBuilder.DropTable(
                name: "TenantRolePermissions");

            migrationBuilder.DropTable(
                name: "TenantRoles");

            migrationBuilder.DropIndex(
                name: "IX_Employees_RoleId",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "RoleId",
                table: "Employees");

            migrationBuilder.AddColumn<string>(
                name: "EmployeeType",
                table: "Employees",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "EmployeeTypePermissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    EmployeeType = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Permission = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    TenantId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeTypePermissions", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeTypePermissions_TenantId_EmployeeType_Permission",
                table: "EmployeeTypePermissions",
                columns: new[] { "TenantId", "EmployeeType", "Permission" },
                unique: true);
        }
    }
}
