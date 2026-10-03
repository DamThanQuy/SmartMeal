using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;
using static SmartMeal.Tests.Infrastructure.SqlHelper;

namespace SmartMeal.Tests;

/// <summary>Migration HealthProfileExtras trên hồ sơ đã có: mục tiêu nước mặc định, mã danh mục, dữ liệu dị ứng được giữ.</summary>
public class HealthMigrationTests
{
    private const string PreviousMigration = "20261003014147_DiaryIntegrity";
    private const string TargetMigration = "20261003015022_HealthProfileExtras";

    [DbFact]
    public async Task Existing_profiles_get_the_default_water_goal_and_catalog_entries_get_codes()
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
                INSERT INTO "Users" ("Id","Email","FullName","IsEmailVerified","IsPro","Role","CreatedAt")
                VALUES ('00000000-0000-0000-0000-0000000000b1','legacy@example.com','Legacy',true,false,'User',now());

                INSERT INTO "HealthProfiles" ("Id","UserId","Gender","Age","HeightCm","CurrentWeightKg","TargetWeightKg","ActivityLevel","Goal",
                    "BMI","BMR","TDEE","DailyCaloriesTarget","DailyCarbsTargetGrams","DailyFatTargetGrams","DailyProteinTargetGrams","UpdatedAt")
                VALUES ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','Male',30,175,70,65,'Moderate','Maintain',
                    22.9,1648.75,2556,2556,319,71,160,now());

                INSERT INTO "UserAllergies" ("HealthProfileId","AllergyId") VALUES ('30000000-0000-0000-0000-000000000001',2);
                """);

            await using (var db = new ApplicationDbContext(options))
            {
                await db.GetService<IMigrator>().MigrateAsync(TargetMigration);
            }

            Assert.Equal(2000, await ScalarAsync<int>(connection, """SELECT "WaterGoalMl" FROM "HealthProfiles" """));
            Assert.True(await ScalarAsync<bool>(connection, """SELECT "DateOfBirth" IS NULL FROM "HealthProfiles" """));
            Assert.Equal(2, await ScalarAsync<int>(connection, """SELECT "AllergyId" FROM "UserAllergies" """));

            Assert.Equal("peanut", await ScalarAsync<string>(connection, """SELECT "Code" FROM "Allergies" WHERE "Id" = 2"""));
            Assert.Equal(8L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "Allergies" """));
            Assert.Equal("dyslipidemia", await ScalarAsync<string>(connection, """SELECT "Code" FROM "MedicalConditions" WHERE "Id" = 4"""));
            Assert.Equal("lowCarb", await ScalarAsync<string>(connection, """SELECT "Code" FROM "Tags" WHERE "Id" = 7"""));
            Assert.Equal(0L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "Tags" WHERE "Code" = '' """));
        }
        finally
        {
            await DropDatabaseAsync(admin, dbName);
        }
    }
}
