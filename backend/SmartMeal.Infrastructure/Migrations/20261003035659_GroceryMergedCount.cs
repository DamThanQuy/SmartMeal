using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartMeal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class GroceryMergedCount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MergedFromRecipeCount",
                table: "GroceryItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Dòng cũ tạo từ thực đơn có RecipeId; số bữa đã gộp không được lưu trước đây nên coi là 1 để tạo lại danh sách
            // vẫn thay được chúng (món tự thêm không có RecipeId nên giữ 0 và không bị xóa).
            migrationBuilder.Sql("""
                UPDATE "GroceryItems" SET "MergedFromRecipeCount" = 1 WHERE "RecipeId" IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MergedFromRecipeCount",
                table: "GroceryItems");
        }
    }
}
