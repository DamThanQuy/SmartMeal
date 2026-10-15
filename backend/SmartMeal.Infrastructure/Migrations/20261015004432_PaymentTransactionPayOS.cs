using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartMeal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PaymentTransactionPayOS : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CheckoutUrl",
                table: "PaymentTransactions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "OrderCode",
                table: "PaymentTransactions",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QrCode",
                table: "PaymentTransactions",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_OrderCode",
                table: "PaymentTransactions",
                column: "OrderCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PaymentTransactions_OrderCode",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "CheckoutUrl",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "OrderCode",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "QrCode",
                table: "PaymentTransactions");
        }
    }
}
