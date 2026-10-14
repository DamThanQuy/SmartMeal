using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartMeal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueGoogleSubject : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Users_GoogleId",
                table: "Users",
                column: "GoogleId",
                unique: true,
                filter: "\"GoogleId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_GoogleId",
                table: "Users");
        }
    }
}
