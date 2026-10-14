using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;
using static SmartMeal.Tests.Infrastructure.SqlHelper;

namespace SmartMeal.Tests;

/// <summary>Migration GamificationXp trên dữ liệu cũ: pet trùng, XP tặng sẵn, thử thách không có ngày bắt đầu, luật chấm của thử thách mẫu.</summary>
public class GamificationMigrationTests
{
    private const string PreviousMigration = "20261003040410_FoodCatalog";
    private const string TargetMigration = "20261003135522_GamificationXp";

    [DbFact]
    public async Task Legacy_pets_and_challenge_joins_are_cleaned_and_the_seed_challenges_get_their_rules()
    {
        var (admin, dbName, connection) = NewDatabase("smartmeal_mig");
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(connection).Options;

        try
        {
            await using (var db = new ApplicationDbContext(options))
            {
                await db.GetService<IMigrator>().MigrateAsync(PreviousMigration);
            }

            await ExecuteAsync(connection, """
                INSERT INTO "Users" ("Id","Email","FullName","IsEmailVerified","IsPro","Role","CreatedAt","FailedLoginCount")
                VALUES ('00000000-0000-0000-0000-0000000000a1','game@example.com','Game',true,false,'User',now(),0);

                INSERT INTO "HealthPets" ("Id","UserId","PetName","PetType","Level","Exp","NextLevelExp","Stage","Mood","CurrentOutfit","StatusMessage","LastUpdated") VALUES
                 ('80000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','Bé Bi','Dino',1,20,100,'Baby','Happy','Default','cũ','2026-01-01 00:00:00+00'),
                 ('80000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','Dino Healthy','Dino',1,20,100,'Baby','Happy','Default','Dino đang vui','2026-02-01 00:00:00+00');

                INSERT INTO "Challenges" ("Id","Title","Description","ImageUrl","DurationDays","Category","TargetValuePerDay","RewardExp","RewardBadge","IsActive") VALUES
                 ('90000000-0000-0000-0000-000000000001','7 Ngày Uống Đủ 2L Nước','x','',7,'EatClean',0,150,'Hydration Master',true),
                 ('90000000-0000-0000-0000-000000000002','Eat Clean 14 Ngày','x','',14,'EatClean',0,300,'Clean Eater Pro',true),
                 ('90000000-0000-0000-0000-000000000003','10.000 Bước Chân Mỗi Ngày','x','',5,'EatClean',0,200,'Speed Runner',true);

                INSERT INTO "UserChallenges" ("Id","UserId","ChallengeId","StartDate","JoinedAt","CompletedDays","IsCompleted") VALUES
                 ('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','90000000-0000-0000-0000-000000000001','0001-01-01','2026-03-05 10:00:00+00',1,false),
                 ('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','90000000-0000-0000-0000-000000000001','0001-01-01','2026-03-09 10:00:00+00',1,false);
                """);

            await using (var db = new ApplicationDbContext(options))
            {
                await db.GetService<IMigrator>().MigrateAsync(TargetMigration);
            }

            Assert.Equal(1L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "HealthPets" """));
            Assert.Equal("80000000-0000-0000-0000-000000000002", (await ScalarAsync<Guid>(connection, """SELECT "Id" FROM "HealthPets" """)).ToString()); // giữ bản cập nhật gần nhất
            Assert.Equal("Bé Mầm", await ScalarAsync<string>(connection, """SELECT "PetName" FROM "HealthPets" """));
            Assert.Equal(0, await ScalarAsync<int>(connection, """SELECT "TotalXp" FROM "HealthPets" """));
            Assert.Equal(0, await ScalarAsync<int>(connection, """SELECT "Exp" FROM "HealthPets" """));
            Assert.Equal(500, await ScalarAsync<int>(connection, """SELECT "NextLevelExp" FROM "HealthPets" """));

            Assert.Equal(1L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "UserChallenges" """));
            Assert.Equal("2026-03-05", await ScalarAsync<string>(connection, """SELECT to_char("StartDate", 'YYYY-MM-DD') FROM "UserChallenges" """));
            Assert.Equal(0, await ScalarAsync<int>(connection, """SELECT "CompletedDays" FROM "UserChallenges" """));

            var duplicatePet = await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(connection, """
                INSERT INTO "HealthPets" ("Id","UserId","PetName","PetType","TotalXp","Level","Exp","NextLevelExp","Stage","Mood","CurrentOutfit","StatusMessage","LastUpdated")
                VALUES ('80000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-0000000000a1','x','Dino',0,1,0,500,'Baby','Happy','Default','',now());
                """));
            Assert.Equal(PostgresErrorCodes.UniqueViolation, duplicatePet.SqlState);

            // Khởi động lại: luật chấm của ba thử thách mẫu được bù, chạy lần hai không đổi gì thêm.
            for (var run = 0; run < 2; run++)
            {
                await using var db = new ApplicationDbContext(options);
                await DbInitializer.SeedAsync(db);
            }

            Assert.Equal("DrinkWater", await ScalarAsync<string>(connection, """SELECT "Category" FROM "Challenges" WHERE "Title" = '7 Ngày Uống Đủ 2L Nước' """));
            Assert.Equal(2000, await ScalarAsync<int>(connection, """SELECT "TargetValuePerDay" FROM "Challenges" WHERE "Title" = '7 Ngày Uống Đủ 2L Nước' """));
            Assert.Equal(3, await ScalarAsync<int>(connection, """SELECT "TargetValuePerDay" FROM "Challenges" WHERE "Title" = 'Eat Clean 14 Ngày' """));
            Assert.Equal("Exercise", await ScalarAsync<string>(connection, """SELECT "Category" FROM "Challenges" WHERE "Title" = '10.000 Bước Chân Mỗi Ngày' """));
            Assert.Equal(10000, await ScalarAsync<int>(connection, """SELECT "TargetValuePerDay" FROM "Challenges" WHERE "Title" = '10.000 Bước Chân Mỗi Ngày' """));
        }
        finally
        {
            await DropDatabaseAsync(admin, dbName);
        }
    }
}
