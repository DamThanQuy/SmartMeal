using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>P2-BE-05: danh sách đi chợ — gộp nguyên liệu, giá theo đơn vị, số bữa đã gộp, đánh dấu hàng loạt, carry-over.</summary>
public class GroceryTests : IClassFixture<ApiFactory>
{
    private const string WeekA = "2026-09-07";
    private const string WeekB = "2026-09-14";

    private readonly ApiFactory _factory;

    public GroceryTests(ApiFactory factory) => _factory = factory;

    private static async Task<List<RecipePayload>> RecipesAsync(HttpClient client) =>
        (await (await client.GetAsync("/api/recipes")).ReadEnvelopeAsync<List<RecipePayload>>()).Data!;

    private static RecipePayload Recipe(IEnumerable<RecipePayload> recipes, string titlePart) =>
        recipes.Single(r => r.Title.Contains(titlePart));

    private static async Task PlanAsync(HttpClient client, string date, string mealType, Guid recipeId)
    {
        var response = await client.PostJsonAsync("/api/mealplanner/assign", new { planDate = date, mealType, recipeId });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task<GroceryPayload> GenerateAsync(HttpClient client, string start, string end, bool? clearExisting = null)
    {
        var response = await client.PostJsonAsync("/api/grocery/generate-from-plan",
            clearExisting is null ? new { startDate = start, endDate = end } : new { startDate = start, endDate = end, clearExisting });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<GroceryPayload>()).Data!;
    }

    private static async Task<GroceryPayload> ListAsync(HttpClient client) =>
        (await (await client.GetAsync("/api/grocery")).ReadEnvelopeAsync<GroceryPayload>()).Data!;

    private static GroceryItemPayload Item(GroceryPayload list, string namePart) =>
        list.Categories.SelectMany(c => c.Items).Single(i => i.IngredientName.Contains(namePart));

    private static async Task<GroceryItemPayload> AddCustomAsync(HttpClient client, string name, double amount = 1, string unit = "phần")
    {
        var response = await client.PostJsonAsync("/api/grocery/items", new { ingredientName = name, amount, unit });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<GroceryItemPayload>()).Data!;
    }

    // ───────────────────────────── Tạo từ thực đơn ─────────────────────────────

    [DbFact]
    public async Task Generating_merges_the_same_ingredient_and_reports_how_many_meals_it_came_from()
    {
        var user = await _factory.RegisterUserAsync();
        var recipes = await RecipesAsync(user.Client);
        await PlanAsync(user.Client, WeekA, "Lunch", Recipe(recipes, "Salad ức gà").Id); // ức gà 150 g
        await PlanAsync(user.Client, WeekA, "Breakfast", Recipe(recipes, "Cháo yến mạch").Id); // ức gà 100 g

        var list = await GenerateAsync(user.Client, WeekA, WeekA);

        var chicken = Item(list, "Ức gà");
        Assert.Equal(250, chicken.Amount);
        Assert.Equal("g", chicken.Unit);
        Assert.Equal(2, chicken.MergedFromRecipeCount);
        Assert.Equal(45000m, chicken.EstimatedPriceVnd); // 18.000 đ / 100 g × 250 g
        var tomato = Item(list, "Cà chua bi");
        Assert.Equal(1, tomato.MergedFromRecipeCount);
        Assert.Equal(3500m, tomato.EstimatedPriceVnd); // 7.000 đ / 100 g × 50 g
        Assert.Equal(list.Categories.SelectMany(c => c.Items).Sum(i => i.EstimatedPriceVnd), list.TotalEstimatedCostVnd);
        Assert.Equal(list.Categories.SelectMany(c => c.Items).Count(), list.TotalItems);
    }

    [DbFact]
    public async Task Countable_ingredients_are_priced_per_unit_not_per_hundred()
    {
        var user = await _factory.RegisterUserAsync();
        var recipes = await RecipesAsync(user.Client);
        await PlanAsync(user.Client, WeekA, "Breakfast", Recipe(recipes, "Trứng cuộn").Id); // 2 quả trứng

        var egg = Item(await GenerateAsync(user.Client, WeekA, WeekA), "Trứng");

        Assert.Equal(2, egg.Amount);
        Assert.Equal("quả", egg.Unit);
        Assert.Equal(8000m, egg.EstimatedPriceVnd); // 4.000 đ / quả × 2 (trước đây chỉ 80 đ)
    }

    [DbFact]
    public async Task The_same_dish_planned_on_two_days_doubles_the_amount_and_the_meal_count()
    {
        var user = await _factory.RegisterUserAsync();
        var recipe = Recipe(await RecipesAsync(user.Client), "Cá hồi");
        await PlanAsync(user.Client, WeekA, "Lunch", recipe.Id);
        await PlanAsync(user.Client, "2026-09-08", "Lunch", recipe.Id);

        var salmon = Item(await GenerateAsync(user.Client, WeekA, "2026-09-13"), "Cá hồi");

        Assert.Equal(360, salmon.Amount);
        Assert.Equal(2, salmon.MergedFromRecipeCount);
    }

    [DbFact]
    public async Task Kilograms_and_grams_of_one_ingredient_are_merged_in_grams()
    {
        await using var factory = new ApiFactory();
        var (heavy, light) = (Guid.NewGuid(), Guid.NewGuid());
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var flour = new Ingredient { Name = "Bột thử", Category = "Grain", DefaultUnit = "g", EstimatedPriceVnd = 1000 };
            db.Ingredients.Add(flour);
            db.Recipes.AddRange(
                new Recipe { Id = heavy, Title = "Bánh lớn", Instructions = "x", RecipeIngredients = { new RecipeIngredient { IngredientId = flour.Id, Amount = 1.5, Unit = "kg" } } },
                new Recipe { Id = light, Title = "Bánh nhỏ", Instructions = "x", RecipeIngredients = { new RecipeIngredient { IngredientId = flour.Id, Amount = 500, Unit = "g" } } });
            await db.SaveChangesAsync();
        }

        var user = await factory.RegisterUserAsync();
        await PlanAsync(user.Client, WeekA, "Lunch", heavy);
        await PlanAsync(user.Client, WeekA, "Dinner", light);

        var flourLine = Item(await GenerateAsync(user.Client, WeekA, WeekA), "Bột thử");

        Assert.Equal(2000, flourLine.Amount);
        Assert.Equal("g", flourLine.Unit);
        Assert.Equal(20000m, flourLine.EstimatedPriceVnd);
        Assert.Equal(2, flourLine.MergedFromRecipeCount);
    }

    [DbFact]
    public async Task Regenerating_replaces_the_generated_lines_but_keeps_items_the_user_added()
    {
        var user = await _factory.RegisterUserAsync();
        var recipes = await RecipesAsync(user.Client);
        await PlanAsync(user.Client, WeekA, "Lunch", Recipe(recipes, "Cá hồi").Id);
        await PlanAsync(user.Client, WeekB, "Lunch", Recipe(recipes, "Cơm gạo lứt").Id);
        var custom = await AddCustomAsync(user.Client, "Muối");
        Assert.Equal(0, custom.MergedFromRecipeCount);

        await GenerateAsync(user.Client, WeekA, WeekA);
        var second = await GenerateAsync(user.Client, WeekB, WeekB);

        var names = second.Categories.SelectMany(c => c.Items).Select(i => i.IngredientName).ToList();
        Assert.Contains("Muối", names);
        Assert.Contains(names, n => n.Contains("Thịt bò"));
        Assert.DoesNotContain(names, n => n.Contains("Cá hồi"));
    }

    [DbFact]
    public async Task Carry_over_keeps_leftovers_and_adds_the_new_week_on_top()
    {
        var user = await _factory.RegisterUserAsync();
        var recipes = await RecipesAsync(user.Client);
        await PlanAsync(user.Client, WeekA, "Breakfast", Recipe(recipes, "Cháo yến mạch").Id); // yến mạch 60 + ức gà 100
        await PlanAsync(user.Client, WeekB, "Lunch", Recipe(recipes, "Salad ức gà").Id);        // ức gà 150 + ...
        var first = await GenerateAsync(user.Client, WeekA, WeekA);
        await user.Client.PatchAsJsonAsync($"/api/grocery/items/{Item(first, "Yến mạch").Id}/check", new { isChecked = true }, ApiTestHelpers.Json);

        var carried = await GenerateAsync(user.Client, WeekB, WeekB, clearExisting: false);

        var chicken = Item(carried, "Ức gà");
        Assert.Equal(250, chicken.Amount);          // 100 còn lại + 150 tuần mới
        Assert.Equal(2, chicken.MergedFromRecipeCount);
        var oats = Item(carried, "Yến mạch");
        Assert.True(oats.IsChecked);                // đã mua thì giữ nguyên
        Assert.Equal(60, oats.Amount);
        Assert.Contains(carried.Categories.SelectMany(c => c.Items), i => i.IngredientName.Contains("Xà lách"));
    }

    [DbFact]
    public async Task Generating_validates_the_range_and_needs_planned_meals()
    {
        var user = await _factory.RegisterUserAsync();

        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.PostJsonAsync("/api/grocery/generate-from-plan", new { startDate = WeekA, endDate = WeekA })).StatusCode); // chưa có thực đơn
        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.PostJsonAsync("/api/grocery/generate-from-plan", new { startDate = WeekB, endDate = WeekA })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.PostJsonAsync("/api/grocery/generate-from-plan", new { startDate = "2026-01-01", endDate = "2026-12-31" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.PostJsonAsync("/api/grocery/generate-from-plan", new { })).StatusCode);
        Assert.Equal(0, (await ListAsync(user.Client)).TotalItems);
    }

    // ───────────────────────────── Đánh dấu / xóa ─────────────────────────────

    [DbFact]
    public async Task Check_all_marks_every_item_and_can_be_undone()
    {
        var user = await _factory.RegisterUserAsync();
        await AddCustomAsync(user.Client, "Hành");
        await AddCustomAsync(user.Client, "Tỏi");
        var third = await AddCustomAsync(user.Client, "Gừng");
        await user.Client.PatchAsJsonAsync($"/api/grocery/items/{third.Id}/check", new { isChecked = true }, ApiTestHelpers.Json);

        var all = await user.Client.PatchAsJsonAsync("/api/grocery/items/check-all", new { isChecked = true }, ApiTestHelpers.Json);
        Assert.Equal(HttpStatusCode.OK, all.StatusCode);
        var checkedList = (await all.ReadEnvelopeAsync<GroceryPayload>()).Data!;
        Assert.Equal(3, checkedList.CheckedItems);
        Assert.Equal(3, (await ListAsync(user.Client)).CheckedItems);

        var none = (await (await user.Client.PatchAsJsonAsync("/api/grocery/items/check-all", new { isChecked = false }, ApiTestHelpers.Json)).ReadEnvelopeAsync<GroceryPayload>()).Data!;
        Assert.Equal(0, none.CheckedItems);

        var noBody = await user.Client.PatchAsync("/api/grocery/items/check-all", null);
        Assert.Equal(HttpStatusCode.OK, noBody.StatusCode);
        Assert.Equal(3, (await noBody.ReadEnvelopeAsync<GroceryPayload>()).Data!.CheckedItems);
    }

    [DbFact]
    public async Task Check_all_only_touches_the_callers_own_list()
    {
        var user = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();
        await AddCustomAsync(user.Client, "Hành");
        await AddCustomAsync(other.Client, "Tỏi");

        await user.Client.PatchAsJsonAsync("/api/grocery/items/check-all", new { isChecked = true }, ApiTestHelpers.Json);

        Assert.Equal(1, (await ListAsync(user.Client)).CheckedItems);
        Assert.Equal(0, (await ListAsync(other.Client)).CheckedItems);
    }

    [DbFact]
    public async Task Items_belong_to_their_owner_and_missing_ones_are_404()
    {
        var owner = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();
        var item = await AddCustomAsync(owner.Client, "Hành");

        Assert.Equal(HttpStatusCode.NotFound, (await other.Client.PatchAsJsonAsync($"/api/grocery/items/{item.Id}/check", new { isChecked = true }, ApiTestHelpers.Json)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.Client.DeleteAsync($"/api/grocery/items/{item.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.Client.DeleteAsync($"/api/grocery/items/{Guid.NewGuid()}")).StatusCode);
        Assert.Equal(1, (await ListAsync(owner.Client)).TotalItems);

        Assert.Equal(HttpStatusCode.OK, (await owner.Client.DeleteAsync($"/api/grocery/items/{item.Id}")).StatusCode);
        Assert.Equal(0, (await ListAsync(owner.Client)).TotalItems);
    }

    [DbFact]
    public async Task Clear_checked_removes_only_bought_items()
    {
        var user = await _factory.RegisterUserAsync();
        var bought = await AddCustomAsync(user.Client, "Hành");
        await AddCustomAsync(user.Client, "Tỏi");
        await user.Client.PatchAsJsonAsync($"/api/grocery/items/{bought.Id}/check", new { isChecked = true }, ApiTestHelpers.Json);

        var response = await user.Client.DeleteAsync("/api/grocery/clear-checked");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await ListAsync(user.Client);
        Assert.Equal(new[] { "Tỏi" }, list.Categories.SelectMany(c => c.Items).Select(i => i.IngredientName));
    }

    [DbFact]
    public async Task Custom_items_are_validated_and_the_list_needs_a_login()
    {
        var user = await _factory.RegisterUserAsync();

        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.PostJsonAsync("/api/grocery/items", new { ingredientName = "  ", amount = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.PostJsonAsync("/api/grocery/items", new { ingredientName = "Hành", amount = 0 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.PostJsonAsync("/api/grocery/items", new { ingredientName = new string('a', 101), amount = 1 })).StatusCode);
        Assert.Equal(0, (await ListAsync(user.Client)).TotalItems);

        var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/grocery")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PatchAsync("/api/grocery/items/check-all", null)).StatusCode);
    }
}
