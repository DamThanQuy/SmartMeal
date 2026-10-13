using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;
using static SmartMeal.Tests.Infrastructure.SqlHelper;

namespace SmartMeal.Tests;

/// <summary>
/// Chạy migration DiaryIntegrity trên dữ liệu "bẩn" có sẵn (dòng nhóm trùng do request song song, MealType lệch
/// hoa/thường hoặc lạ) để chắc rằng việc gộp không làm mất món và unique index tạo được.
/// </summary>
public class DiaryMigrationTests
{
    private const string PreviousMigration = "20260926152332_AddRemainingModules";
    private const string TargetMigration = "20261003014147_DiaryIntegrity";

    [DbFact]
    public async Task Migration_merges_duplicate_groups_normalizes_meal_types_and_keeps_every_item()
    {
        var (admin, dbName, connection) = NewDatabase("smartmeal_mig");
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(connection).Options;

        try
        {
            await using (var db = new ApplicationDbContext(options))
            {
                await db.GetService<IMigrator>().MigrateAsync(PreviousMigration);
            }

            // Dữ liệu cũ: cùng ngày/bữa có 3 dòng nhóm (Lunch, Lunch, lunch) + 1 dòng "Brunch" lạ.
            await ExecuteAsync(connection, """
                INSERT INTO "Users" ("Id","Email","FullName","IsEmailVerified","IsPro","Role","CreatedAt")
                VALUES ('00000000-0000-0000-0000-0000000000a1','legacy@example.com','Legacy',true,false,'User',now());

                INSERT INTO "NutritionDiaries" ("Id","UserId","LogDate","MealType","CreatedAt") VALUES
                 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','2026-02-01','Lunch','2026-02-01 05:00:00+00'),
                 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','2026-02-01','Lunch','2026-02-01 05:00:01+00'),
                 ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000a1','2026-02-01','lunch','2026-02-01 05:00:02+00'),
                 ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000a1','2026-02-01','Brunch','2026-02-01 05:00:03+00');

                INSERT INTO "DiaryItems" ("Id","NutritionDiaryId","FoodName","ServingSize","Unit","Calories","CarbsGrams","FatGrams","ProteinGrams","LogMethod") VALUES
                 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Cơm',100,'g',130,28,0,3,'Manual'),
                 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Gà',100,'g',165,0,4,31,'Manual'),
                 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003','Canh',100,'g',40,5,1,2,'Manual'),
                 ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000004','Bánh',100,'g',250,40,8,5,'Manual');
                """);

            await using (var db = new ApplicationDbContext(options))
            {
                await db.GetService<IMigrator>().MigrateAsync(TargetMigration);
            }

            // Còn đúng 2 dòng nhóm: Lunch (đã gộp) và Snack (từ "Brunch").
            Assert.Equal(2L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "NutritionDiaries" """));
            Assert.Equal(
                "Lunch,Snack",
                await ScalarAsync<string>(connection, """SELECT string_agg("MealType", ',' ORDER BY "MealType") FROM "NutritionDiaries" """));

            // Không mất món nào: 3 món trong Lunch, 1 món trong Snack.
            Assert.Equal(4L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "DiaryItems" """));
            Assert.Equal(3L, await ScalarAsync<long>(connection, """
                SELECT COUNT(*) FROM "DiaryItems" i JOIN "NutritionDiaries" d ON d."Id" = i."NutritionDiaryId" WHERE d."MealType" = 'Lunch'
                """));
            Assert.Equal("Bánh", await ScalarAsync<string>(connection, """
                SELECT i."FoodName" FROM "DiaryItems" i JOIN "NutritionDiaries" d ON d."Id" = i."NutritionDiaryId" WHERE d."MealType" = 'Snack'
                """));

            // Giờ ghi của món cũ lấy từ dòng nhóm gốc của từng món (không bị dồn về một thời điểm).
            Assert.Equal(
                new DateTime(2026, 2, 1, 5, 0, 1, DateTimeKind.Utc),
                await ScalarAsync<DateTime>(connection, """SELECT "CreatedAt" FROM "DiaryItems" WHERE "FoodName" = 'Gà' """));

            // Unique index có hiệu lực: tạo thêm dòng nhóm trùng phải bị từ chối.
            var duplicate = await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(connection, """
                INSERT INTO "NutritionDiaries" ("Id","UserId","LogDate","MealType","CreatedAt")
                VALUES (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','2026-02-01','Lunch',now())
                """));
            Assert.Equal(PostgresErrorCodes.UniqueViolation, duplicate.SqlState);
        }
        finally
        {
            await DropDatabaseAsync(admin, dbName);
        }
    }
}
