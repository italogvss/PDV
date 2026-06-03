using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PDV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ConvertPaymentMethodAndExpenseCategoryToEnum : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rename stored values to match enum member names (no spaces/accents allowed in C# identifiers)
            migrationBuilder.Sql("UPDATE Sales SET PaymentMethod = 'CreditCard' WHERE PaymentMethod = 'Credit Card'");
            migrationBuilder.Sql("UPDATE Sales SET PaymentMethod = 'DebitCard' WHERE PaymentMethod = 'Debit Card'");
            migrationBuilder.Sql("UPDATE Expenses SET Category = 'Salarios' WHERE Category = 'Salários'");
            migrationBuilder.Sql("UPDATE Expenses SET Category = 'Manutencao' WHERE Category = 'Manutenção'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE Sales SET PaymentMethod = 'Credit Card' WHERE PaymentMethod = 'CreditCard'");
            migrationBuilder.Sql("UPDATE Sales SET PaymentMethod = 'Debit Card' WHERE PaymentMethod = 'DebitCard'");
            migrationBuilder.Sql("UPDATE Expenses SET Category = 'Salários' WHERE Category = 'Salarios'");
            migrationBuilder.Sql("UPDATE Expenses SET Category = 'Manutenção' WHERE Category = 'Manutencao'");
        }
    }
}
