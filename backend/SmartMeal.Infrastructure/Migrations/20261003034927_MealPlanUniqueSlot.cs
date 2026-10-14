using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartMeal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MealPlanUniqueSlot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Sửa dữ liệu cũ TRƯỚC khi tạo unique index.
            // 1. Tên bữa về dạng chuẩn ("lunch " → "Lunch"); giá trị lạ giữ nguyên.
            migrationBuilder.Sql("""
                UPDATE "MealPlans"
                SET "MealType" = CASE lower(btrim("MealType"))
                    WHEN 'breakfast' THEN 'Breakfast'
                    WHEN 'lunch' THEN 'Lunch'
                    WHEN 'dinner' THEN 'Dinner'
                    WHEN 'snack' THEN 'Snack'
                    ELSE "MealType"
                END;
                """);

            // 2. Trước đây một (ngày, bữa) có thể có nhiều dòng (gán song song). Giữ một dòng mỗi ô, ưu tiên dòng đã
            //    đánh dấu hoàn thành.
            migrationBuilder.Sql("""
                DELETE FROM "MealPlans" AS d
                USING (
                    SELECT "Id",
                           ROW_NUMBER() OVER (PARTITION BY "UserId", "PlanDate", "MealType" ORDER BY "IsCompleted" DESC, "Id") AS rn
                    FROM "MealPlans"
                ) AS r
                WHERE d."Id" = r."Id" AND r.rn > 1;
                """);

            migrationBuilder.DropIndex(
                name: "IX_MealPlans_UserId",
                table: "MealPlans");

            migrationBuilder.CreateIndex(
                name: "IX_MealPlans_UserId_PlanDate_MealType",
                table: "MealPlans",
                columns: new[] { "UserId", "PlanDate", "MealType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Lưu ý: các dòng trùng đã bị xóa ở Up() không thể khôi phục.
            migrationBuilder.DropIndex(
                name: "IX_MealPlans_UserId_PlanDate_MealType",
                table: "MealPlans");

            migrationBuilder.CreateIndex(
                name: "IX_MealPlans_UserId",
                table: "MealPlans",
                column: "UserId");
        }
    }
}
