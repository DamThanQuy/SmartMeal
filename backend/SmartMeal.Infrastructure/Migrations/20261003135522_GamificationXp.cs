using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartMeal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class GamificationXp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserChallenges_UserId",
                table: "UserChallenges");

            migrationBuilder.DropIndex(
                name: "IX_HealthPets_UserId",
                table: "HealthPets");

            migrationBuilder.AddColumn<int>(
                name: "TotalXp",
                table: "HealthPets",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Sửa dữ liệu cũ TRƯỚC khi tạo unique index.
            // 1. Mỗi người một pet: giữ bản cập nhật gần nhất, bỏ bản trùng.
            migrationBuilder.Sql("""
                DELETE FROM "HealthPets" AS d
                USING (
                    SELECT "Id",
                           ROW_NUMBER() OVER (PARTITION BY "UserId" ORDER BY "LastUpdated" DESC, "Id") AS rn
                    FROM "HealthPets"
                ) AS r
                WHERE d."Id" = r."Id" AND r.rn > 1;
                """);

            // 2. XP trước đây không bao giờ được cộng thật (pet được tạo sẵn 20 XP tặng) nên đưa về 0 để sổ XP mới là nguồn duy nhất;
            //    tên mặc định cũ đổi theo thiết kế ("Bé Mầm"); lời nhắn giờ được tính khi đọc nên bỏ giá trị lưu cũ.
            migrationBuilder.Sql("""
                UPDATE "HealthPets"
                SET "TotalXp" = 0, "Level" = 1, "Exp" = 0, "NextLevelExp" = 500, "Stage" = 'Baby', "StatusMessage" = '',
                    "PetName" = CASE WHEN "PetName" = 'Dino Healthy' THEN 'Bé Mầm' ELSE "PetName" END;
                """);

            // 3. Thử thách: mỗi người một bản ghi cho mỗi thử thách (giữ bản đã hoàn thành, rồi bản tham gia sớm nhất);
            //    StartDate trước đây không được gán (0001-01-01) nên lấy ngày tham gia; CompletedDays trước đây bị đặt cứng
            //    là 1 khi tham gia nên về 0 và được tính lại từ nhật ký ở lần đánh giá kế tiếp.
            migrationBuilder.Sql("""
                DELETE FROM "UserChallenges" AS d
                USING (
                    SELECT "Id",
                           ROW_NUMBER() OVER (PARTITION BY "UserId", "ChallengeId" ORDER BY "IsCompleted" DESC, "JoinedAt", "Id") AS rn
                    FROM "UserChallenges"
                ) AS r
                WHERE d."Id" = r."Id" AND r.rn > 1;
                """);
            migrationBuilder.Sql("""
                UPDATE "UserChallenges"
                SET "StartDate" = ("JoinedAt" AT TIME ZONE 'UTC')::date
                WHERE "StartDate" = DATE '0001-01-01';
                """);
            migrationBuilder.Sql("""
                UPDATE "UserChallenges" SET "CompletedDays" = 0 WHERE NOT "IsCompleted";
                """);

            migrationBuilder.CreateTable(
                name: "UserBadges",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    BadgeId = table.Column<string>(type: "text", nullable: false),
                    UnlockedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserBadges", x => new { x.UserId, x.BadgeId });
                    table.ForeignKey(
                        name: "FK_UserBadges_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "XpEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventKey = table.Column<string>(type: "text", nullable: false),
                    Kind = table.Column<string>(type: "text", nullable: false),
                    Xp = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_XpEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_XpEvents_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserChallenges_UserId_ChallengeId",
                table: "UserChallenges",
                columns: new[] { "UserId", "ChallengeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HealthPets_UserId",
                table: "HealthPets",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_XpEvents_UserId_EventKey",
                table: "XpEvents",
                columns: new[] { "UserId", "EventKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserBadges");

            migrationBuilder.DropTable(
                name: "XpEvents");

            migrationBuilder.DropIndex(
                name: "IX_UserChallenges_UserId_ChallengeId",
                table: "UserChallenges");

            migrationBuilder.DropIndex(
                name: "IX_HealthPets_UserId",
                table: "HealthPets");

            migrationBuilder.DropColumn(
                name: "TotalXp",
                table: "HealthPets");

            migrationBuilder.CreateIndex(
                name: "IX_UserChallenges_UserId",
                table: "UserChallenges",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_HealthPets_UserId",
                table: "HealthPets",
                column: "UserId");
        }
    }
}
