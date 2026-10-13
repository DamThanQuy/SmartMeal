using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>P2-BE-04: thực đơn — mỗi ô một món, keepExisting (BR-163), đánh dấu đã nấu, gợi ý theo loại bữa.</summary>
public class PlannerTests : IClassFixture<ApiFactory>
{
    private const string Monday = "2026-08-03";

    private readonly ApiFactory _factory;

    public PlannerTests(ApiFactory factory) => _factory = factory;

    private static async Task<List<RecipePayload>> RecipesAsync(HttpClient client) =>
        (await (await client.GetAsync("/api/recipes")).ReadEnvelopeAsync<List<RecipePayload>>()).Data!;

    private static async Task<WeeklyPlanPayload> WeekAsync(HttpClient client, string start = Monday)
    {
        var response = await client.GetAsync($"/api/mealplanner/week?startDate={start}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<WeeklyPlanPayload>()).Data!;
    }

    private static Task<HttpResponseMessage> AssignAsync(HttpClient client, string date, string mealType, Guid recipeId) =>
        client.PostJsonAsync("/api/mealplanner/assign", new { planDate = date, mealType, recipeId });

    private static async Task<WeeklyPlanPayload> GenerateAsync(HttpClient client, object body)
    {
        var response = await client.PostJsonAsync("/api/mealplanner/auto-generate", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<WeeklyPlanPayload>()).Data!;
    }

    private static IEnumerable<PlannedMealPayload> Meals(WeeklyPlanPayload week) => week.Days.SelectMany(d => d.Meals);

    // ───────────────────────────── Gán món ─────────────────────────────

    [DbFact]
    public async Task Assigning_into_a_slot_replaces_the_dish_and_normalises_the_meal_type()
    {
        var user = await _factory.RegisterUserAsync();
        var recipes = await RecipesAsync(user.Client);

        var first = await AssignAsync(user.Client, Monday, "lunch", recipes[0].Id);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var item = (await first.ReadEnvelopeAsync<PlannedMealPayload>()).Data!;
        Assert.Equal("Lunch", item.MealType);

        await user.Client.PatchAsJsonAsync($"/api/mealplanner/{item.MealPlanId}/complete", new { isCompleted = true }, ApiTestHelpers.Json);
        var replaced = (await (await AssignAsync(user.Client, Monday, "LUNCH", recipes[1].Id)).ReadEnvelopeAsync<PlannedMealPayload>()).Data!;

        Assert.Equal(item.MealPlanId, replaced.MealPlanId);
        Assert.Equal(recipes[1].Id, replaced.RecipeId);
        Assert.False(replaced.IsCompleted); // món mới thì chưa nấu
        var lunches = Meals(await WeekAsync(user.Client)).Where(m => m.MealType == "Lunch").ToList();
        Assert.Single(lunches);
        Assert.Equal(recipes[1].Id, lunches[0].RecipeId);
    }

    [DbFact]
    public async Task Parallel_assignments_to_the_same_slot_all_succeed_and_leave_a_single_dish()
    {
        // Bốn request cùng đọc "ô trống" rồi mới cùng chèn: chỉ một request chèn được, ba request còn lại phải gặp
        // unique index và chuyển sang cập nhật thay vì trả 500.
        const int parties = 4;
        var rendezvous = new RendezvousInterceptor(parties, sql => sql.Contains("FROM \"MealPlans\"") && sql.Contains("\"PlanDate\" ="));
        await using var factory = new ApiFactory().WithServices(services =>
            services.ConfigureDbContext<ApplicationDbContext>(options => options.AddInterceptors(rendezvous)));
        var user = await factory.RegisterUserAsync();
        var recipes = await RecipesAsync(user.Client);

        var responses = await Task.WhenAll(Enumerable.Range(0, parties)
            .Select(i => AssignAsync(user.Client, Monday, "Dinner", recipes[i].Id)));

        Assert.True(rendezvous.Arrived >= parties, "Các request không gặp nhau ở điểm hẹn nên test không chứng minh được gì.");
        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        Assert.Single(Meals(await WeekAsync(user.Client)), m => m.MealType == "Dinner");
    }

    [DbFact]
    public async Task Assign_validates_the_meal_type_the_recipe_and_the_session()
    {
        var user = await _factory.RegisterUserAsync();
        var recipe = (await RecipesAsync(user.Client)).First();

        Assert.Equal(HttpStatusCode.BadRequest, (await AssignAsync(user.Client, Monday, "Brunch", recipe.Id)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await AssignAsync(user.Client, Monday, "Lunch", Guid.NewGuid())).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await AssignAsync(_factory.CreateClient(), Monday, "Lunch", recipe.Id)).StatusCode);
        Assert.Empty(Meals(await WeekAsync(user.Client)));
    }

    [DbFact]
    public async Task The_week_lists_each_days_meals_in_meal_order()
    {
        var user = await _factory.RegisterUserAsync();
        var recipes = await RecipesAsync(user.Client);
        await AssignAsync(user.Client, Monday, "Snack", recipes[0].Id);
        await AssignAsync(user.Client, Monday, "Dinner", recipes[1].Id);
        await AssignAsync(user.Client, Monday, "Breakfast", recipes[2].Id);

        var day = (await WeekAsync(user.Client)).Days[0];

        Assert.Equal(new[] { "Breakfast", "Dinner", "Snack" }, day.Meals.Select(m => m.MealType));
    }

    // ───────────────────────────── Đánh dấu đã nấu ─────────────────────────────

    [DbFact]
    public async Task Completing_a_meal_can_be_undone_and_belongs_to_its_owner()
    {
        var owner = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();
        var recipe = (await RecipesAsync(owner.Client)).First();
        var item = (await (await AssignAsync(owner.Client, Monday, "Lunch", recipe.Id)).ReadEnvelopeAsync<PlannedMealPayload>()).Data!;

        var done = await owner.Client.PatchAsJsonAsync($"/api/mealplanner/{item.MealPlanId}/complete", new { }, ApiTestHelpers.Json);
        Assert.Equal(HttpStatusCode.OK, done.StatusCode);
        Assert.True((await done.ReadEnvelopeAsync<PlannedMealPayload>()).Data!.IsCompleted);
        Assert.True(Meals(await WeekAsync(owner.Client)).Single().IsCompleted);

        var undone = await owner.Client.PatchAsJsonAsync($"/api/mealplanner/{item.MealPlanId}/complete", new { isCompleted = false }, ApiTestHelpers.Json);
        Assert.False((await undone.ReadEnvelopeAsync<PlannedMealPayload>()).Data!.IsCompleted);

        Assert.Equal(HttpStatusCode.NotFound, (await other.Client.PatchAsJsonAsync($"/api/mealplanner/{item.MealPlanId}/complete", new { }, ApiTestHelpers.Json)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.Client.PatchAsJsonAsync($"/api/mealplanner/{Guid.NewGuid()}/complete", new { }, ApiTestHelpers.Json)).StatusCode);
    }

    [DbFact]
    public async Task Completing_without_a_body_means_done()
    {
        var user = await _factory.RegisterUserAsync();
        var recipe = (await RecipesAsync(user.Client)).First();
        var item = (await (await AssignAsync(user.Client, Monday, "Lunch", recipe.Id)).ReadEnvelopeAsync<PlannedMealPayload>()).Data!;

        var response = await user.Client.PatchAsync($"/api/mealplanner/{item.MealPlanId}/complete", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True((await response.ReadEnvelopeAsync<PlannedMealPayload>()).Data!.IsCompleted);
    }

    // ───────────────────────────── Tạo thực đơn tự động ─────────────────────────────

    [DbFact]
    public async Task Auto_generate_fills_every_slot_once_with_dishes_that_suit_the_meal()
    {
        var user = await _factory.RegisterUserAsync();
        var recipes = await RecipesAsync(user.Client);

        var week = await GenerateAsync(user.Client, new { startDate = Monday });

        Assert.Equal(7, week.Days.Count);
        Assert.All(week.Days, d =>
        {
            Assert.Equal(new[] { "Breakfast", "Lunch", "Dinner" }, d.Meals.Select(m => m.MealType));
            Assert.Equal(3, d.Meals.Select(m => m.RecipeId).Distinct().Count()); // không lặp món trong ngày
        });

        var byId = recipes.ToDictionary(r => r.Id);
        Assert.All(Meals(week), m =>
        {
            var suits = byId[m.RecipeId].MealTypes;
            Assert.True(suits.Count == 0 || suits.Contains(m.MealType), $"{m.RecipeTitle} không hợp bữa {m.MealType}");
        });
    }

    [DbFact]
    public async Task Auto_generate_adds_a_snack_each_day_only_when_asked()
    {
        var user = await _factory.RegisterUserAsync();

        var without = await GenerateAsync(user.Client, new { startDate = Monday });
        var with = await GenerateAsync(user.Client, new { startDate = Monday, includeSnack = true });

        Assert.DoesNotContain(Meals(without), m => m.MealType == "Snack");
        Assert.Equal(7, Meals(with).Count(m => m.MealType == "Snack"));
        Assert.Equal(28, Meals(with).Count());
    }

    [DbFact]
    public async Task Auto_generate_replaces_the_week_by_default_but_keeps_chosen_dishes_with_keepExisting()
    {
        var user = await _factory.RegisterUserAsync();
        var recipes = await RecipesAsync(user.Client);
        // Canh đậu hũ chỉ hợp bữa trưa/tối nên tạo tự động sẽ không bao giờ xếp nó vào bữa sáng.
        var soup = recipes.Single(r => r.Title.Contains("Canh đậu hũ"));
        var chosen = (await (await AssignAsync(user.Client, Monday, "Breakfast", soup.Id)).ReadEnvelopeAsync<PlannedMealPayload>()).Data!;
        await user.Client.PatchAsJsonAsync($"/api/mealplanner/{chosen.MealPlanId}/complete", new { }, ApiTestHelpers.Json);

        var kept = await GenerateAsync(user.Client, new { startDate = Monday, keepExisting = true });
        var keptBreakfast = kept.Days[0].Meals.Single(m => m.MealType == "Breakfast");
        Assert.Equal(chosen.MealPlanId, keptBreakfast.MealPlanId);
        Assert.Equal(soup.Id, keptBreakfast.RecipeId);
        Assert.True(keptBreakfast.IsCompleted);
        Assert.Equal(21, Meals(kept).Count());
        Assert.Equal(7, Meals(kept).Count(m => m.MealType == "Breakfast"));
        Assert.Equal(1, kept.Days[0].Meals.Count(m => m.RecipeId == soup.Id)); // không xếp thêm món đã có trong ngày

        var replaced = await GenerateAsync(user.Client, new { startDate = Monday });
        Assert.NotEqual(soup.Id, replaced.Days[0].Meals.Single(m => m.MealType == "Breakfast").RecipeId);
        Assert.DoesNotContain(Meals(replaced), m => m.MealPlanId == chosen.MealPlanId);
        Assert.Equal(21, Meals(replaced).Count());
    }

    [DbFact]
    public async Task Auto_generate_only_touches_the_requested_week_and_the_callers_own_plan()
    {
        var user = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();
        var recipe = (await RecipesAsync(user.Client)).First();
        await AssignAsync(user.Client, "2026-08-12", "Lunch", recipe.Id); // tuần sau
        await AssignAsync(other.Client, Monday, "Lunch", recipe.Id);

        await GenerateAsync(user.Client, new { startDate = Monday });

        Assert.Single(Meals(await WeekAsync(user.Client, "2026-08-10")));
        Assert.Single(Meals(await WeekAsync(other.Client)));
    }

    [DbFact]
    public async Task Planner_endpoints_require_a_login()
    {
        var anonymous = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"/api/mealplanner/week?startDate={Monday}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostJsonAsync("/api/mealplanner/auto-generate", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PatchAsJsonAsync($"/api/mealplanner/{Guid.NewGuid()}/complete", new { }, ApiTestHelpers.Json)).StatusCode);
    }
}
