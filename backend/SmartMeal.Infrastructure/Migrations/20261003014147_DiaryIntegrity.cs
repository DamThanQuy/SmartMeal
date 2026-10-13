using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartMeal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DiaryIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WaterLogs_UserId",
                table: "WaterLogs");

            migrationBuilder.DropIndex(
                name: "IX_NutritionDiaries_UserId",
                table: "NutritionDiaries");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "DiaryItems",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            // ── Sửa dữ liệu cũ TRƯỚC khi tạo unique index, nếu không việc tạo index sẽ lỗi ──

            // 1. Món cũ chưa có giờ ghi riêng: lấy giờ tạo của dòng nhóm chứa nó.
            migrationBuilder.Sql("""
                UPDATE "DiaryItems" AS i
                SET "CreatedAt" = d."CreatedAt"
                FROM "NutritionDiaries" AS d
                WHERE d."Id" = i."NutritionDiaryId";
                """);

            // 2. Chuẩn hóa MealType về 4 giá trị chuẩn. Giá trị lạ trước đây bị cộng vào tổng calo nhưng không
            //    hiện ở nhóm nào trong /daily, nên đưa vào Snack để món hiện lại.
            migrationBuilder.Sql("""
                UPDATE "NutritionDiaries"
                SET "MealType" = CASE lower(btrim("MealType"))
                    WHEN 'breakfast' THEN 'Breakfast'
                    WHEN 'lunch' THEN 'Lunch'
                    WHEN 'dinner' THEN 'Dinner'
                    ELSE 'Snack'
                END;
                """);

            // 3. Gộp các dòng nhóm trùng (do request song song): chuyển món về dòng cũ nhất rồi xóa dòng thừa.
            migrationBuilder.Sql("""
                WITH ranked AS (
                    SELECT "Id",
                           FIRST_VALUE("Id") OVER w AS keep_id,
                           ROW_NUMBER() OVER w AS rn
                    FROM "NutritionDiaries"
                    WINDOW w AS (PARTITION BY "UserId", "LogDate", "MealType" ORDER BY "CreatedAt", "Id")
                )
                UPDATE "DiaryItems" AS i
                SET "NutritionDiaryId" = r.keep_id
                FROM ranked AS r
                WHERE i."NutritionDiaryId" = r."Id" AND r.rn > 1;
                """);

            migrationBuilder.Sql("""
                DELETE FROM "NutritionDiaries" AS d
                USING (
                    SELECT "Id",
                           ROW_NUMBER() OVER (PARTITION BY "UserId", "LogDate", "MealType" ORDER BY "CreatedAt", "Id") AS rn
                    FROM "NutritionDiaries"
                ) AS r
                WHERE d."Id" = r."Id" AND r.rn > 1;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_WaterLogs_UserId_LogDate",
                table: "WaterLogs",
                columns: new[] { "UserId", "LogDate" });

            migrationBuilder.CreateIndex(
                name: "IX_NutritionDiaries_UserId_LogDate_MealType",
                table: "NutritionDiaries",
                columns: new[] { "UserId", "LogDate", "MealType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Lưu ý: việc chuẩn hóa MealType và gộp dòng nhóm trùng ở Up() không thể hoàn tác.
            migrationBuilder.DropIndex(
                name: "IX_WaterLogs_UserId_LogDate",
                table: "WaterLogs");

            migrationBuilder.DropIndex(
                name: "IX_NutritionDiaries_UserId_LogDate_MealType",
                table: "NutritionDiaries");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "DiaryItems");

            migrationBuilder.CreateIndex(
                name: "IX_WaterLogs_UserId",
                table: "WaterLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_NutritionDiaries_UserId",
                table: "NutritionDiaries",
                column: "UserId");
        }
    }
}
