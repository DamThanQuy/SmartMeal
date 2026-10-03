using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>P1-BE-12 (dòng nhóm trùng), P1-BE-05 (sửa món + giờ ghi), P1-BE-07 (macro tuần).</summary>
public class DiaryTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public DiaryTests(ApiFactory factory) => _factory = factory;

    private static object Item(string name, double calories = 100, double protein = 10, double carbs = 20, double fat = 5) => new
    {
        foodName = name,
        servingSize = 100,
        unit = "g",
        calories,
        carbsGrams = carbs,
        fatGrams = fat,
        proteinGrams = protein,
        logMethod = "Manual"
    };

    private static object LogRequest(string date, string mealType, string name, double calories = 100) => new
    {
        logDate = date,
        mealType,
        foodName = name,
        servingSize = 100,
        unit = "g",
        calories,
        carbsGrams = 20,
        fatGrams = 5,
        proteinGrams = 10,
        logMethod = "Manual"
    };

    private static async Task<DailyPayload> GetDailyAsync(HttpClient client, string date)
    {
        var response = await client.GetAsync($"/api/nutritiondiary/daily?date={date}");
        response.EnsureSuccessStatusCode();
        return (await response.ReadEnvelopeAsync<DailyPayload>()).Data!;
    }

    [DbFact]
    public async Task Concurrent_logs_for_one_meal_create_a_single_group_and_every_item_is_listed()
    {
        var user = await _factory.RegisterUserAsync();

        // Nhiều vòng, mỗi vòng một ngày mới (chưa có dòng nhóm) để chắc chắn chạm đường "tạo trùng".
        for (var round = 0; round < 6; round++)
        {
            var date = new DateOnly(2026, 3, 1).AddDays(round).ToString("yyyy-MM-dd");

            var responses = await Task.WhenAll(Enumerable.Range(0, 8).Select(i =>
                user.Client.PostJsonAsync("/api/nutritiondiary/log", LogRequest(date, "Lunch", $"Món {i}", 100 + i))));

            Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));

            var daily = await GetDailyAsync(user.Client, date);
            var lunch = daily.Meals.Single(m => m.MealType == "Lunch");
            Assert.Equal(8, lunch.Items.Count);
            // Tổng calo phải bằng đúng tổng các món được liệt kê (trước đây lệch khi có dòng nhóm trùng).
            Assert.Equal(daily.Meals.Sum(m => m.Items.Sum(i => i.Calories)), daily.TotalCalories);
        }

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var groups = await db.NutritionDiaries.Where(d => d.UserId == user.Id).ToListAsync();
        Assert.Equal(6, groups.Count);
        Assert.Equal(6, groups.Select(g => g.LogDate).Distinct().Count());
    }

    [DbFact]
    public async Task Meal_type_is_case_insensitive_and_stored_in_canonical_form()
    {
        var user = await _factory.RegisterUserAsync();
        const string date = "2026-04-01";

        var first = await user.Client.PostJsonAsync("/api/nutritiondiary/log", LogRequest(date, "breakfast", "Bánh mì"));
        var second = await user.Client.PostJsonAsync("/api/nutritiondiary/log", LogRequest(date, " BREAKFAST ", "Trứng"));

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal("Breakfast", (await first.ReadEnvelopeAsync<DiaryItemPayload>()).Data!.MealType);

        var daily = await GetDailyAsync(user.Client, date);
        Assert.Equal(2, daily.Meals.Single(m => m.MealType == "Breakfast").Items.Count);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(1, await db.NutritionDiaries.CountAsync(d => d.UserId == user.Id && d.LogDate == DateOnly.Parse(date)));
    }

    [DbFact]
    public async Task Unknown_meal_type_is_rejected_instead_of_creating_an_invisible_item()
    {
        var user = await _factory.RegisterUserAsync();

        var response = await user.Client.PostJsonAsync("/api/nutritiondiary/log", LogRequest("2026-04-02", "Brunch", "Bánh"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var envelope = await response.ReadEnvelopeAsync<object>();
        Assert.Contains("Breakfast", envelope.Message);
        Assert.Equal(0, (await GetDailyAsync(user.Client, "2026-04-02")).TotalCalories);
    }

    [DbFact]
    public async Task Invalid_numbers_and_far_future_dates_are_rejected()
    {
        var user = await _factory.RegisterUserAsync();

        var negative = await user.Client.PostJsonAsync("/api/nutritiondiary/log", new
        {
            logDate = "2026-04-02", mealType = "Lunch", foodName = "Cơm", servingSize = 0, unit = "g", calories = -5,
            carbsGrams = 0, fatGrams = 0, proteinGrams = 0, logMethod = "Manual"
        });
        var future = await user.Client.PostJsonAsync("/api/nutritiondiary/log", LogRequest("2999-01-01", "Lunch", "Cơm"));

        Assert.Equal(HttpStatusCode.BadRequest, negative.StatusCode);
        var errors = (await negative.ReadEnvelopeAsync<object>()).Errors!;
        Assert.Contains(errors, e => e.Contains("Khẩu phần phải lớn hơn 0"));
        Assert.Contains(errors, e => e.Contains("Calo phải từ 0 đến 10000"));
        Assert.Equal(HttpStatusCode.BadRequest, future.StatusCode);
    }

    [DbFact]
    public async Task Batch_log_saves_all_items_in_order_in_one_call()
    {
        var user = await _factory.RegisterUserAsync();
        const string date = "2026-04-03";

        var response = await user.Client.PostJsonAsync("/api/nutritiondiary/log/batch", new
        {
            logDate = date,
            mealType = "dinner",
            items = new[] { Item("Cơm", 200), Item("Gà kho", 300), Item("Canh", 50) }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var created = (await response.ReadEnvelopeAsync<List<DiaryItemPayload>>()).Data!;
        Assert.Equal(new[] { "Cơm", "Gà kho", "Canh" }, created.Select(i => i.FoodName));
        Assert.All(created, i => Assert.Equal("Dinner", i.MealType));

        var dinner = (await GetDailyAsync(user.Client, date)).Meals.Single(m => m.MealType == "Dinner");
        Assert.Equal(new[] { "Cơm", "Gà kho", "Canh" }, dinner.Items.Select(i => i.FoodName));
        Assert.Equal(550, dinner.SubtotalCalories);
    }

    [DbFact]
    public async Task Batch_log_with_an_unknown_reference_saves_nothing()
    {
        var user = await _factory.RegisterUserAsync();
        const string date = "2026-04-04";

        var response = await user.Client.PostJsonAsync("/api/nutritiondiary/log/batch", new
        {
            logDate = date,
            mealType = "Lunch",
            items = new object[]
            {
                Item("Cơm"),
                new
                {
                    foodName = "Không tồn tại", servingSize = 100, unit = "g", calories = 10, carbsGrams = 1, fatGrams = 1,
                    proteinGrams = 1, logMethod = "Manual", ingredientId = Guid.NewGuid()
                }
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty((await GetDailyAsync(user.Client, date)).Meals.SelectMany(m => m.Items));
    }

    [DbFact]
    public async Task Items_carry_a_logging_time_and_come_back_in_logging_order()
    {
        var user = await _factory.RegisterUserAsync();
        const string date = "2026-04-05";
        var before = DateTime.UtcNow.AddSeconds(-5);

        foreach (var name in new[] { "A", "B", "C" })
        {
            (await user.Client.PostJsonAsync("/api/nutritiondiary/log", LogRequest(date, "Snack", name))).EnsureSuccessStatusCode();
        }

        var snack = (await GetDailyAsync(user.Client, date)).Meals.Single(m => m.MealType == "Snack");
        Assert.Equal(new[] { "A", "B", "C" }, snack.Items.Select(i => i.FoodName));
        Assert.All(snack.Items, i => Assert.True(i.CreatedAt > before && i.CreatedAt <= DateTime.UtcNow.AddSeconds(5)));
    }

    [DbFact]
    public async Task Update_changes_amounts_and_moves_the_item_to_another_meal()
    {
        var user = await _factory.RegisterUserAsync();
        const string date = "2026-04-06";
        var created = (await (await user.Client.PostJsonAsync("/api/nutritiondiary/log", LogRequest(date, "Breakfast", "Phở", 400)))
            .ReadEnvelopeAsync<DiaryItemPayload>()).Data!;

        var response = await user.Client.PutJsonAsync($"/api/nutritiondiary/items/{created.Id}", new
        {
            mealType = "dinner",
            servingSize = 250,
            calories = 500
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.ReadEnvelopeAsync<DiaryItemPayload>()).Data!;
        Assert.Equal(created.Id, updated.Id);                  // id không đổi (không còn "ghi mới rồi xóa cũ")
        Assert.Equal("Dinner", updated.MealType);
        Assert.Equal(250, updated.ServingSize);
        Assert.Equal(500, updated.Calories);
        Assert.Equal("Phở", updated.FoodName);                  // trường không gửi thì giữ nguyên
        Assert.Equal(created.CreatedAt, updated.CreatedAt);

        var daily = await GetDailyAsync(user.Client, date);
        Assert.Empty(daily.Meals.Single(m => m.MealType == "Breakfast").Items);
        Assert.Single(daily.Meals.Single(m => m.MealType == "Dinner").Items);
        Assert.Equal(500, daily.TotalCalories);
    }

    [DbFact]
    public async Task Update_can_move_an_item_to_another_day()
    {
        var user = await _factory.RegisterUserAsync();
        var created = (await (await user.Client.PostJsonAsync("/api/nutritiondiary/log", LogRequest("2026-04-07", "Lunch", "Bún")))
            .ReadEnvelopeAsync<DiaryItemPayload>()).Data!;

        var response = await user.Client.PutJsonAsync($"/api/nutritiondiary/items/{created.Id}", new { logDate = "2026-04-08" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await GetDailyAsync(user.Client, "2026-04-07")).Meals.SelectMany(m => m.Items));
        Assert.Single((await GetDailyAsync(user.Client, "2026-04-08")).Meals.Single(m => m.MealType == "Lunch").Items);
    }

    [DbFact]
    public async Task Update_and_delete_of_another_users_item_return_404()
    {
        var owner = await _factory.RegisterUserAsync();
        var intruder = await _factory.RegisterUserAsync();
        var created = (await (await owner.Client.PostJsonAsync("/api/nutritiondiary/log", LogRequest("2026-04-09", "Lunch", "Cơm")))
            .ReadEnvelopeAsync<DiaryItemPayload>()).Data!;

        var update = await intruder.Client.PutJsonAsync($"/api/nutritiondiary/items/{created.Id}", new { calories = 1 });
        var delete = await intruder.Client.DeleteAsync($"/api/nutritiondiary/items/{created.Id}");

        Assert.Equal(HttpStatusCode.NotFound, update.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
        Assert.Equal(100, (await GetDailyAsync(owner.Client, "2026-04-09")).TotalCalories);
    }

    [DbFact]
    public async Task Update_validates_input()
    {
        var user = await _factory.RegisterUserAsync();
        var created = (await (await user.Client.PostJsonAsync("/api/nutritiondiary/log", LogRequest("2026-04-10", "Lunch", "Cơm")))
            .ReadEnvelopeAsync<DiaryItemPayload>()).Data!;

        var badMeal = await user.Client.PutJsonAsync($"/api/nutritiondiary/items/{created.Id}", new { mealType = "Brunch" });
        var badServing = await user.Client.PutJsonAsync($"/api/nutritiondiary/items/{created.Id}", new { servingSize = -1 });
        var blankName = await user.Client.PutJsonAsync($"/api/nutritiondiary/items/{created.Id}", new { foodName = "   " });

        Assert.Equal(HttpStatusCode.BadRequest, badMeal.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, badServing.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, blankName.StatusCode);
    }

    [DbFact]
    public async Task Weekly_progress_reports_macros_and_targets_for_every_day()
    {
        var user = await _factory.RegisterUserAsync();
        // Hai món cùng ngày ở hai bữa khác nhau + một món ngày khác.
        (await user.Client.PostJsonAsync("/api/nutritiondiary/log", LogRequest("2026-05-01", "Breakfast", "A", 100))).EnsureSuccessStatusCode();
        (await user.Client.PostJsonAsync("/api/nutritiondiary/log", LogRequest("2026-05-01", "Lunch", "B", 300))).EnsureSuccessStatusCode();
        (await user.Client.PostJsonAsync("/api/nutritiondiary/log", LogRequest("2026-05-03", "Dinner", "C", 50))).EnsureSuccessStatusCode();

        var response = await user.Client.GetAsync("/api/nutritiondiary/weekly-progress?startDate=2026-05-01");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var days = (await response.ReadEnvelopeAsync<WeeklyPayload>()).Data!.Days;
        Assert.Equal(7, days.Count);
        Assert.Equal(400, days[0].Calories);
        Assert.Equal(20, days[0].ProteinGrams);   // 2 món × 10 g
        Assert.Equal(40, days[0].CarbsGrams);
        Assert.Equal(10, days[0].FatGrams);
        Assert.Equal(0, days[1].ProteinGrams);
        Assert.Equal(50, days[2].Calories);
        Assert.All(days, d =>
        {
            Assert.True(d.TargetCalories > 0);
            Assert.True(d.TargetProteinGrams > 0 && d.TargetCarbsGrams > 0 && d.TargetFatGrams > 0);
        });
    }
}
