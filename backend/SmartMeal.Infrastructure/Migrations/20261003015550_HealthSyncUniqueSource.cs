using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartMeal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class HealthSyncUniqueSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Sửa dữ liệu cũ TRƯỚC khi tạo unique index.
            // 1. Chuẩn hóa nguồn về 4 giá trị chuẩn (nguồn lạ, vd. "DevSample", coi là Manual).
            migrationBuilder.Sql("""
                UPDATE "HealthSyncLogs"
                SET "Source" = CASE lower(btrim("Source"))
                    WHEN 'healthconnect' THEN 'HealthConnect'
                    WHEN 'applehealth' THEN 'AppleHealth'
                    WHEN 'googlefit' THEN 'GoogleFit'
                    ELSE 'Manual'
                END;
                """);

            // 2. Trước đây mỗi lần gửi thêm một dòng và số liệu bị cộng dồn. Client gửi tổng của ngày nên giữ bản
            //    mới nhất của mỗi (người dùng, ngày, nguồn) và bỏ các bản cũ.
            migrationBuilder.Sql("""
                DELETE FROM "HealthSyncLogs" AS d
                USING (
                    SELECT "Id",
                           ROW_NUMBER() OVER (PARTITION BY "UserId", "SyncDate", "Source" ORDER BY "SyncedAt" DESC, "Id") AS rn
                    FROM "HealthSyncLogs"
                ) AS r
                WHERE d."Id" = r."Id" AND r.rn > 1;
                """);

            migrationBuilder.DropIndex(
                name: "IX_HealthSyncLogs_UserId",
                table: "HealthSyncLogs");

            migrationBuilder.CreateIndex(
                name: "IX_HealthSyncLogs_UserId_SyncDate_Source",
                table: "HealthSyncLogs",
                columns: new[] { "UserId", "SyncDate", "Source" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Lưu ý: các bản ghi trùng đã bị xóa ở Up() không thể khôi phục.
            migrationBuilder.DropIndex(
                name: "IX_HealthSyncLogs_UserId_SyncDate_Source",
                table: "HealthSyncLogs");

            migrationBuilder.CreateIndex(
                name: "IX_HealthSyncLogs_UserId",
                table: "HealthSyncLogs",
                column: "UserId");
        }
    }
}
