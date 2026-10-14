using System.Net;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>P1-BE-08: danh mục thực phẩm — món ăn mẫu + khẩu phần, tự nhập món, mã vạch, gần đây, yêu thích.</summary>
public class FoodTests : IClassFixture<ApiFactory>
{
    private const int SeededIngredients = 12;
    private const int SeededDishes = 15;

    private readonly ApiFactory _factory;

    public FoodTests(ApiFactory factory) => _factory = factory;

    private sealed record FoodPage(List<FoodPayload> Items, int Page, int PageSize, int TotalCount, int TotalPages);

    private static async Task<FoodPage> ListAsync(HttpClient client, string query = "")
    {
        var response = await client.GetAsync("/api/foods" + query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<FoodPage>()).Data!;
    }

    private static async Task<FoodPayload> CreateAsync(HttpClient client, string name, object? extra = null)
    {
        var response = await client.PostJsonAsync("/api/foods", extra ?? Body(name));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<FoodPayload>()).Data!;
    }

    private static object Body(string name, string? barcode = null, int[]? allergyIds = null, object[]? servings = null) => new
    {
        name,
        category = "Snack",
        caloriesPer100g = 350,
        carbsPer100g = 60,
        fatPer100g = 10,
        proteinPer100g = 6,
        barcode,
        allergyIds,
        servings
    };

    private static async Task LogAsync(HttpClient client, string date, Guid ingredientId, string name) =>
        Assert.Equal(HttpStatusCode.OK, (await client.PostJsonAsync("/api/nutritiondiary/log", new
        {
            logDate = date,
            mealType = "Lunch",
            foodName = name,
            servingSize = 1,
            unit = "phần",
            calories = 100,
            carbsGrams = 10,
            fatGrams = 1,
            proteinGrams = 5,
            logMethod = "Manual",
            ingredientId
        })).StatusCode);

    // ───────────────────────────── Danh mục chung ─────────────────────────────

    [DbFact]
    public async Task Vietnamese_dishes_are_searchable_with_or_without_diacritics_and_carry_servings()
    {
        var anonymous = _factory.CreateClient();

        var accented = await ListAsync(anonymous, "?search=" + Uri.EscapeDataString("phở"));
        var plain = await ListAsync(anonymous, "?search=PHO%20BO");

        var pho = Assert.Single(accented.Items, f => f.Name == "Phở bò");
        Assert.Equal(accented.Items.Select(f => f.Id).Order(), plain.Items.Select(f => f.Id).Order());
        Assert.Equal(500, pho.Servings.Single(s => s.Id == pho.DefaultServingId).Grams);
        Assert.Equal("1 tô vừa", pho.Servings.Single(s => s.Id == pho.DefaultServingId).Label);
        Assert.Contains(pho.Servings, s => s.Label == "1 tô nhỏ" && s.Grams == 400);
        Assert.False(pho.IsVerified); // số liệu mẫu chưa được chuyên gia rà soát
        Assert.False(pho.IsUserCreated);
        Assert.False(pho.IsFavorite);
        Assert.Equal("Dish", pho.Category);
    }

    [DbFact]
    public async Task Existing_ingredients_stay_verified_and_get_a_default_serving()
    {
        var all = await ListAsync(_factory.CreateClient(), "?pageSize=100");

        Assert.Equal(SeededIngredients + SeededDishes, all.TotalCount);
        var egg = all.Items.Single(f => f.Name == "Trứng gà");
        Assert.True(egg.IsVerified);
        Assert.Equal(new[] { 4 }, egg.AllergyIds);
        Assert.Equal(100, egg.Servings.Single(s => s.Id == egg.DefaultServingId).Grams);
        Assert.Contains(egg.Servings, s => s.Label == "1 quả" && s.Grams == 50);
        Assert.All(all.Items, f => Assert.NotEmpty(f.Servings));
        Assert.All(all.Items, f => Assert.NotNull(f.DefaultServingId));
    }

    [DbFact]
    public async Task Foods_report_every_allergen_they_contain()
    {
        var all = (await ListAsync(_factory.CreateClient(), "?pageSize=100")).Items;

        Assert.Equal(new[] { 1 }, all.Single(f => f.Name == "Cá hồi phi lê").AllergyIds);
        Assert.Equal(new[] { 5 }, all.Single(f => f.Name == "Bánh mì thịt").AllergyIds);
        Assert.Equal(new[] { 1 }, all.Single(f => f.Name == "Gỏi cuốn tôm thịt").AllergyIds);
        Assert.Empty(all.Single(f => f.Name == "Phở bò").AllergyIds);
    }

    [DbFact]
    public async Task Listing_pages_and_filters_by_category()
    {
        var client = _factory.CreateClient();

        var page = await ListAsync(client, "?page=2&pageSize=10");
        var dishes = await ListAsync(client, "?category=dish&pageSize=100");

        Assert.Equal(10, page.Items.Count);
        Assert.Equal(2, page.Page);
        Assert.Equal(SeededIngredients + SeededDishes, page.TotalCount);
        Assert.Equal(SeededDishes, dishes.TotalCount);
        Assert.All(dishes.Items, f => Assert.Equal("Dish", f.Category));
    }

    [DbFact]
    public async Task Unknown_scope_is_rejected_and_personal_scopes_need_a_login()
    {
        var anonymous = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.BadRequest, (await anonymous.GetAsync("/api/foods?scope=everyone")).StatusCode);
        foreach (var scope in new[] { "mine", "recent", "favorite" })
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"/api/foods?scope={scope}")).StatusCode);
        }
    }

    // ───────────────────────────── Tự nhập món ─────────────────────────────

    [DbFact]
    public async Task A_custom_food_is_labelled_unverified_and_visible_only_to_its_owner()
    {
        var owner = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();

        var created = await CreateAsync(owner.Client, "Bánh tráng trộn nhà làm");

        Assert.True(created.IsUserCreated);
        Assert.False(created.IsVerified);
        Assert.Equal(350, created.CaloriesPer100g);
        Assert.Equal(100, created.Servings.Single(s => s.Id == created.DefaultServingId).Grams);

        Assert.Equal(HttpStatusCode.OK, (await owner.Client.GetAsync($"/api/foods/{created.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.Client.GetAsync($"/api/foods/{created.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync($"/api/foods/{created.Id}")).StatusCode);

        var search = "?search=" + Uri.EscapeDataString("banh trang tron");
        Assert.Contains((await ListAsync(owner.Client, search)).Items, f => f.Id == created.Id);
        Assert.DoesNotContain((await ListAsync(other.Client, search)).Items, f => f.Id == created.Id);
        Assert.DoesNotContain((await ListAsync(_factory.CreateClient(), search)).Items, f => f.Id == created.Id);

        Assert.Equal(created.Id, Assert.Single((await ListAsync(owner.Client, "?scope=mine")).Items).Id);
        Assert.Empty((await ListAsync(other.Client, "?scope=mine")).Items);
        Assert.Equal(SeededIngredients + SeededDishes + 1, (await ListAsync(owner.Client)).TotalCount);
        Assert.Equal(SeededIngredients + SeededDishes, (await ListAsync(other.Client)).TotalCount);
    }

    [DbFact]
    public async Task A_custom_food_keeps_the_servings_and_allergens_the_user_entered()
    {
        var user = await _factory.RegisterUserAsync();

        var created = await CreateAsync(user.Client, "Bánh quy bơ",
            Body("Bánh quy bơ", allergyIds: new[] { 3, 5 }, servings: new object[]
            {
                new { label = "1 hộp", grams = 200 },
                new { label = "1 gói", grams = 30, isDefault = true }
            }));

        Assert.Equal(new[] { 3, 5 }, created.AllergyIds);
        Assert.Equal(new[] { "1 gói", "1 hộp" }, created.Servings.Select(s => s.Label)); // mặc định đứng đầu
        Assert.Equal("1 gói", created.Servings.Single(s => s.Id == created.DefaultServingId).Label);
    }

    [DbFact]
    public async Task Custom_food_input_is_validated_without_inventing_numbers()
    {
        var user = await _factory.RegisterUserAsync();

        async Task<HttpStatusCode> PostAsync(object body) => (await user.Client.PostJsonAsync("/api/foods", body)).StatusCode;

        Assert.Equal(HttpStatusCode.BadRequest, await PostAsync(Body("  ")));
        Assert.Equal(HttpStatusCode.BadRequest, await PostAsync(new { name = "Âm", caloriesPer100g = -1 }));
        Assert.Equal(HttpStatusCode.BadRequest, await PostAsync(new { name = "Quá nhiều", caloriesPer100g = 100, carbsPer100g = 60, fatPer100g = 30, proteinPer100g = 30 }));
        Assert.Equal(HttpStatusCode.BadRequest, await PostAsync(Body("Mã lỗi", barcode: "12ab")));
        Assert.Equal(HttpStatusCode.BadRequest, await PostAsync(Body("Dị ứng lạ", allergyIds: new[] { 999 })));
        Assert.Equal(HttpStatusCode.BadRequest, await PostAsync(Body("Khẩu phần lạ", servings: new object[] { new { label = "x", grams = 0 } })));
        Assert.Empty((await ListAsync(user.Client, "?scope=mine")).Items);

        await CreateAsync(user.Client, "Trùng tên");
        Assert.Equal(HttpStatusCode.Conflict, await PostAsync(Body("trùng TÊN")));
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().PostJsonAsync("/api/foods", Body("Khách"))).StatusCode);
    }

    // ───────────────────────────── Mã vạch ─────────────────────────────

    [DbFact]
    public async Task Barcode_lookup_finds_the_users_own_product_and_404s_otherwise()
    {
        var owner = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();
        var created = await CreateAsync(owner.Client, "Sữa chua nhà làm", Body("Sữa chua nhà làm", barcode: "8934563138165"));
        Assert.Equal("8934563138165", created.Barcode);

        var found = await owner.Client.GetAsync("/api/foods/barcode/8934563138165");
        Assert.Equal(HttpStatusCode.OK, found.StatusCode);
        Assert.Equal(created.Id, (await found.ReadEnvelopeAsync<FoodPayload>()).Data!.Id);

        Assert.Equal(HttpStatusCode.NotFound, (await other.Client.GetAsync("/api/foods/barcode/8934563138165")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync("/api/foods/barcode/8934563138165")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.Client.GetAsync("/api/foods/barcode/00000000")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.Client.GetAsync("/api/foods/barcode/abc")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.Client.GetAsync("/api/foods/barcode/123")).StatusCode);
    }

    // ───────────────────────────── Gần đây / yêu thích ─────────────────────────────

    [DbFact]
    public async Task Recent_foods_come_from_the_diary_most_recent_first()
    {
        var user = await _factory.RegisterUserAsync();
        var stranger = await _factory.RegisterUserAsync();
        var all = (await ListAsync(user.Client, "?pageSize=100")).Items;
        var egg = all.Single(f => f.Name == "Trứng gà");
        var salmon = all.Single(f => f.Name == "Cá hồi phi lê");
        var pho = all.Single(f => f.Name == "Phở bò");
        Assert.Empty((await ListAsync(user.Client, "?scope=recent")).Items);

        await LogAsync(user.Client, "2026-05-01", egg.Id, "Trứng");
        await LogAsync(user.Client, "2026-05-01", salmon.Id, "Cá hồi");
        await LogAsync(user.Client, "2026-05-02", pho.Id, "Phở");
        await LogAsync(user.Client, "2026-05-03", egg.Id, "Trứng lần nữa");

        var recent = await ListAsync(user.Client, "?scope=recent");

        Assert.Equal(new[] { egg.Id, pho.Id, salmon.Id }, recent.Items.Select(f => f.Id));
        Assert.Equal(3, recent.TotalCount);
        Assert.Empty((await ListAsync(stranger.Client, "?scope=recent")).Items);
        Assert.Single((await ListAsync(user.Client, "?scope=recent&search=pho")).Items);
    }

    [DbFact]
    public async Task Favoriting_is_idempotent_listed_by_scope_and_limited_to_visible_foods()
    {
        var user = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();
        var pho = (await ListAsync(user.Client, "?search=pho")).Items.Single(f => f.Name == "Phở bò");
        var secret = await CreateAsync(other.Client, "Món bí mật");

        var first = await user.Client.PostAsync($"/api/foods/{pho.Id}/favorite", null);
        var again = await user.Client.PostAsync($"/api/foods/{pho.Id}/favorite", null);
        Assert.True((await first.ReadEnvelopeAsync<FoodFavoritePayload>()).Data!.IsFavorite);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);

        var favorites = await ListAsync(user.Client, "?scope=favorite");
        Assert.Equal(pho.Id, Assert.Single(favorites.Items).Id);
        Assert.True(favorites.Items[0].IsFavorite);
        Assert.True((await (await user.Client.GetAsync($"/api/foods/{pho.Id}")).ReadEnvelopeAsync<FoodPayload>()).Data!.IsFavorite);
        Assert.False((await (await _factory.CreateClient().GetAsync($"/api/foods/{pho.Id}")).ReadEnvelopeAsync<FoodPayload>()).Data!.IsFavorite);

        var removed = await user.Client.DeleteAsync($"/api/foods/{pho.Id}/favorite");
        Assert.False((await removed.ReadEnvelopeAsync<FoodFavoritePayload>()).Data!.IsFavorite);
        Assert.Equal(HttpStatusCode.OK, (await user.Client.DeleteAsync($"/api/foods/{pho.Id}/favorite")).StatusCode);
        Assert.Empty((await ListAsync(user.Client, "?scope=favorite")).Items);

        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.PostAsync($"/api/foods/{secret.Id}/favorite", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.PostAsync($"/api/foods/{Guid.NewGuid()}/favorite", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().PostAsync($"/api/foods/{pho.Id}/favorite", null)).StatusCode);
    }

    // ───────────────────────────── Xóa món ─────────────────────────────

    [DbFact]
    public async Task Only_the_owner_can_delete_a_custom_food_and_logged_meals_survive()
    {
        var owner = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();
        var mine = await CreateAsync(owner.Client, "Món sẽ xóa");
        var theirs = await CreateAsync(other.Client, "Món của người khác");
        var pho = (await ListAsync(owner.Client, "?search=pho")).Items.Single(f => f.Name == "Phở bò");
        await LogAsync(owner.Client, "2026-05-10", mine.Id, "Món sẽ xóa");

        Assert.Equal(HttpStatusCode.NotFound, (await owner.Client.DeleteAsync($"/api/foods/{theirs.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await owner.Client.DeleteAsync($"/api/foods/{pho.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.Client.DeleteAsync($"/api/foods/{mine.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.Client.DeleteAsync($"/api/foods/{mine.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.Client.GetAsync($"/api/foods/{mine.Id}")).StatusCode);

        var daily = (await (await owner.Client.GetAsync("/api/nutritiondiary/daily?date=2026-05-10")).ReadEnvelopeAsync<DailyPayload>()).Data!;
        Assert.Equal(100, daily.TotalCalories);
        Assert.Equal(HttpStatusCode.OK, (await other.Client.GetAsync($"/api/foods/{theirs.Id}")).StatusCode);
    }

    [DbFact]
    public async Task Deleting_my_personal_data_removes_my_custom_foods_and_favorites()
    {
        var user = await _factory.RegisterUserAsync();
        var pho = (await ListAsync(user.Client, "?search=pho")).Items.Single(f => f.Name == "Phở bò");
        await CreateAsync(user.Client, "Món cá nhân");
        await user.Client.PostAsync($"/api/foods/{pho.Id}/favorite", null);

        var response = await user.Client.DeleteAsync("/api/me/data");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await ListAsync(user.Client, "?scope=mine")).Items);
        Assert.Empty((await ListAsync(user.Client, "?scope=favorite")).Items);
        Assert.Equal(SeededIngredients + SeededDishes, (await ListAsync(user.Client)).TotalCount); // danh mục chung còn nguyên
    }
}
