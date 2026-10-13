using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>P2-BE-01/02/03: công thức kèm chất gây dị ứng, lọc, phân trang, yêu thích và bộ sưu tập của chủ sở hữu.</summary>
public class RecipeTests : IClassFixture<ApiFactory>
{
    // Id danh mục dị ứng (migration seed): 1 hải sản, 4 trứng, 5 gluten, 6 đậu nành, 8 mè.
    private const int Seafood = 1;
    private const int Sesame = 8;

    private readonly ApiFactory _factory;

    public RecipeTests(ApiFactory factory) => _factory = factory;

    private static async Task<List<RecipePayload>> ListAsync(HttpClient client, string query = "")
    {
        var response = await client.GetAsync("/api/recipes" + query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<List<RecipePayload>>()).Data!;
    }

    private static async Task SetAllergiesAsync(HttpClient client, params int[] allergyIds)
    {
        var response = await client.PostJsonAsync("/api/healthprofile/survey", new
        {
            gender = "Male",
            age = 30,
            heightCm = 175,
            currentWeightKg = 70,
            targetWeightKg = 65,
            activityLevel = "Moderate",
            goal = "LoseWeight",
            allergyIds,
            medicalConditionIds = Array.Empty<int>(),
            dietaryPreferenceIds = Array.Empty<int>()
        });
        response.EnsureSuccessStatusCode();
    }

    private static RecipePayload ByTitle(IEnumerable<RecipePayload> recipes, string titlePart) =>
        recipes.Single(r => r.Title.Contains(titlePart));

    // ───────────────────────────── Danh sách + dị ứng ─────────────────────────────

    [DbFact]
    public async Task The_list_is_public_and_every_recipe_reports_its_allergens()
    {
        var anonymous = _factory.CreateClient();

        var recipes = await ListAsync(anonymous);

        Assert.Equal(6, recipes.Count);
        Assert.All(recipes, r => Assert.False(r.IsFavorite));

        var salad = ByTitle(recipes, "Salad ức gà");
        Assert.Equal(new[] { Sesame }, salad.AllergyIds);
        Assert.Equal(new[] { Sesame }, salad.Ingredients.Single(i => i.Name.Contains("Sốt mè")).AllergyIds);
        Assert.Equal(new[] { Seafood }, ByTitle(recipes, "Cá hồi").AllergyIds);
        Assert.Empty(ByTitle(recipes, "Cơm gạo lứt").AllergyIds);
        Assert.Equal(new[] { 5 }, ByTitle(recipes, "Cháo yến mạch").AllergyIds);
        Assert.Equal(new[] { 4 }, ByTitle(recipes, "Trứng cuộn").AllergyIds);
        Assert.Equal(new[] { 6 }, ByTitle(recipes, "Canh đậu hũ").AllergyIds);
    }

    [DbFact]
    public async Task Excluding_my_allergens_removes_every_recipe_that_contains_one()
    {
        var user = await _factory.RegisterUserAsync();
        await SetAllergiesAsync(user.Client, Seafood, Sesame);

        var all = await ListAsync(user.Client);
        var safe = await ListAsync(user.Client, "?excludeMyAllergens=true");

        Assert.Equal(6, all.Count);
        Assert.Equal(4, safe.Count);
        Assert.All(safe, r => Assert.DoesNotContain(r.AllergyIds, id => id == Seafood || id == Sesame));
        Assert.DoesNotContain(safe, r => r.Title.Contains("Cá hồi") || r.Title.Contains("Salad"));
    }

    [DbFact]
    public async Task Excluding_allergens_needs_a_login()
    {
        var response = await _factory.CreateClient().GetAsync("/api/recipes?excludeMyAllergens=true");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False((await response.ReadEnvelopeAsync<object>()).Success);
    }

    [DbFact]
    public async Task A_user_without_declared_allergies_still_sees_everything()
    {
        var user = await _factory.RegisterUserAsync();

        Assert.Equal(6, (await ListAsync(user.Client, "?excludeMyAllergens=true")).Count);
    }

    // ───────────────────────────── Phân trang + bộ lọc ─────────────────────────────

    [DbFact]
    public async Task Paging_returns_the_page_and_reports_totals_in_headers_while_data_stays_an_array()
    {
        var client = _factory.CreateClient();

        var first = await client.GetAsync("/api/recipes");
        Assert.Equal("6", first.Headers.GetValues("X-Total-Count").Single());
        Assert.Equal("1", first.Headers.GetValues("X-Page").Single());

        var page = await client.GetAsync("/api/recipes?page=2&pageSize=4");
        var items = (await page.ReadEnvelopeAsync<List<RecipePayload>>()).Data!;
        Assert.Equal(2, items.Count);
        Assert.Equal("6", page.Headers.GetValues("X-Total-Count").Single());
        Assert.Equal("2", page.Headers.GetValues("X-Total-Pages").Single());
        Assert.Equal("2", page.Headers.GetValues("X-Page").Single());
        Assert.Equal("4", page.Headers.GetValues("X-Page-Size").Single());

        var firstPage = (await (await client.GetAsync("/api/recipes?page=1&pageSize=4")).ReadEnvelopeAsync<List<RecipePayload>>()).Data!;
        Assert.Empty(firstPage.Select(r => r.Id).Intersect(items.Select(r => r.Id)));

        var clamped = await client.GetAsync("/api/recipes?pageSize=1000");
        Assert.Equal("50", clamped.Headers.GetValues("X-Page-Size").Single());
    }

    [DbFact]
    public async Task Meal_type_filter_keeps_only_matching_recipes_and_rejects_unknown_values()
    {
        var client = _factory.CreateClient();

        var breakfast = await ListAsync(client, "?mealType=breakfast");
        Assert.Equal(2, breakfast.Count);
        Assert.All(breakfast, r => Assert.Contains("Breakfast", r.MealTypes));

        var bad = await client.GetAsync("/api/recipes?mealType=Brunch");
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [DbFact]
    public async Task Max_cook_time_filter_uses_prep_plus_cook_minutes()
    {
        var recipes = await ListAsync(_factory.CreateClient(), "?maxCookTimeMinutes=13");

        Assert.Equal(2, recipes.Count);
        Assert.All(recipes, r => Assert.True(r.TotalTimeMinutes <= 13));
    }

    [DbFact]
    public async Task Search_ignores_case_and_vietnamese_diacritics()
    {
        var client = _factory.CreateClient();

        var plain = await ListAsync(client, "?search=UC%20GA");
        var accented = await ListAsync(client, "?search=" + Uri.EscapeDataString("ức gà"));

        Assert.Equal(2, plain.Count);
        Assert.Equal(plain.Select(r => r.Id).Order(), accented.Select(r => r.Id).Order());
    }

    // ───────────────────────────── Chi tiết + yêu thích ─────────────────────────────

    [DbFact]
    public async Task Detail_is_public_reports_my_favorite_flag_and_404s_for_unknown_ids()
    {
        var user = await _factory.RegisterUserAsync();
        var recipe = (await ListAsync(user.Client)).First();

        var toggled = await user.Client.PostAsync($"/api/recipes/{recipe.Id}/favorite", null);
        Assert.Equal(HttpStatusCode.OK, toggled.StatusCode);
        Assert.True((await toggled.ReadEnvelopeAsync<FavoritePayload>()).Data!.IsFavorite);

        var mine = (await (await user.Client.GetAsync($"/api/recipes/{recipe.Id}")).ReadEnvelopeAsync<RecipePayload>()).Data!;
        var anonymous = (await (await _factory.CreateClient().GetAsync($"/api/recipes/{recipe.Id}")).ReadEnvelopeAsync<RecipePayload>()).Data!;
        Assert.True(mine.IsFavorite);
        Assert.False(anonymous.IsFavorite);
        Assert.True((await ListAsync(user.Client)).Single(r => r.Id == recipe.Id).IsFavorite);

        var missing = await user.Client.GetAsync($"/api/recipes/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [DbFact]
    public async Task Toggling_a_favorite_twice_removes_it_and_unknown_recipes_are_404()
    {
        var user = await _factory.RegisterUserAsync();
        var recipe = (await ListAsync(user.Client)).First();

        var on = (await (await user.Client.PostAsync($"/api/recipes/{recipe.Id}/favorite", null)).ReadEnvelopeAsync<FavoritePayload>()).Data!;
        var off = (await (await user.Client.PostAsync($"/api/recipes/{recipe.Id}/favorite", null)).ReadEnvelopeAsync<FavoritePayload>()).Data!;

        Assert.Equal(new FavoritePayload(true, 1), on);
        Assert.Equal(new FavoritePayload(false, 0), off);
        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.PostAsync($"/api/recipes/{Guid.NewGuid()}/favorite", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().PostAsync($"/api/recipes/{recipe.Id}/favorite", null)).StatusCode);
    }

    // ───────────────────────────── Gợi ý theo tủ lạnh ─────────────────────────────

    [DbFact]
    public async Task Pantry_suggestions_match_without_diacritics_and_never_include_my_allergens()
    {
        var anonymous = _factory.CreateClient();
        var user = await _factory.RegisterUserAsync();
        await SetAllergiesAsync(user.Client, Seafood);
        var body = new { availableIngredients = new[] { "ca hoi", "ca chua" } };

        var open = (await (await anonymous.PostJsonAsync("/api/recipes/suggest-by-pantry", body)).ReadEnvelopeAsync<List<RecipePayload>>()).Data!;
        var safe = (await (await user.Client.PostJsonAsync("/api/recipes/suggest-by-pantry", body)).ReadEnvelopeAsync<List<RecipePayload>>()).Data!;

        Assert.Contains(open, r => r.Title.Contains("Cá hồi"));
        Assert.NotEmpty(safe);
        Assert.DoesNotContain(safe, r => r.AllergyIds.Contains(Seafood));
    }

    [DbFact]
    public async Task When_every_match_is_unsafe_the_suggestions_are_empty_with_a_message_not_a_fallback()
    {
        var user = await _factory.RegisterUserAsync();
        await SetAllergiesAsync(user.Client, Seafood);

        var response = await user.Client.PostJsonAsync("/api/recipes/suggest-by-pantry", new { availableIngredients = new[] { "cá hồi" } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var envelope = await response.ReadEnvelopeAsync<List<RecipePayload>>();
        Assert.True(envelope.Success);
        Assert.Empty(envelope.Data!);
        Assert.Contains("dị ứng", envelope.Message);
    }

    [DbFact]
    public async Task Pantry_suggestions_need_at_least_one_ingredient()
    {
        var response = await _factory.CreateClient().PostJsonAsync("/api/recipes/suggest-by-pantry", new { availableIngredients = Array.Empty<string>() });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ───────────────────────────── Bộ sưu tập (BR-152) ─────────────────────────────

    private static async Task<CollectionPayload> CreateCollectionAsync(HttpClient client, string name, bool isPublic = false)
    {
        var response = await client.PostJsonAsync("/api/recipes/collections", new { name, isPublic });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<CollectionPayload>()).Data!;
    }

    private static Task<HttpResponseMessage> PatchAsync(HttpClient client, string url, object body) =>
        client.PatchAsJsonAsync(url, body, ApiTestHelpers.Json);

    [DbFact]
    public async Task The_owner_can_rename_fill_empty_and_delete_a_collection()
    {
        var user = await _factory.RegisterUserAsync();
        var recipes = await ListAsync(user.Client);
        var created = await CreateCollectionAsync(user.Client, "Bữa tối nhanh");
        Assert.True(created.IsOwner);
        Assert.Equal(user.Id, created.OwnerId);

        var add = await user.Client.PostJsonAsync($"/api/recipes/collections/{created.Id}/items", new { recipeId = recipes[0].Id });
        var addAgain = await user.Client.PostJsonAsync($"/api/recipes/collections/{created.Id}/items", new { recipeId = recipes[0].Id });
        Assert.Equal(HttpStatusCode.OK, add.StatusCode);
        Assert.Equal(HttpStatusCode.OK, addAgain.StatusCode);
        await user.Client.PostJsonAsync($"/api/recipes/collections/{created.Id}/items", new { recipeId = recipes[1].Id });

        var rename = await PatchAsync(user.Client, $"/api/recipes/collections/{created.Id}", new { name = "Tối nhanh gọn" });
        Assert.Equal(HttpStatusCode.OK, rename.StatusCode);
        var detail = (await (await user.Client.GetAsync($"/api/recipes/collections/{created.Id}")).ReadEnvelopeAsync<CollectionPayload>()).Data!;
        Assert.Equal("Tối nhanh gọn", detail.Name);
        Assert.Equal(2, detail.RecipeCount);
        Assert.Equal(2, detail.Recipes.Count);

        var removed = await user.Client.DeleteAsync($"/api/recipes/collections/{created.Id}/items/{recipes[0].Id}");
        Assert.Equal(HttpStatusCode.OK, removed.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.DeleteAsync($"/api/recipes/collections/{created.Id}/items/{recipes[0].Id}")).StatusCode);
        var afterRemove = (await (await user.Client.GetAsync($"/api/recipes/collections/{created.Id}")).ReadEnvelopeAsync<CollectionPayload>()).Data!;
        Assert.Equal(new[] { recipes[1].Id }, afterRemove.Recipes.Select(r => r.Id));

        Assert.Equal(HttpStatusCode.OK, (await user.Client.DeleteAsync($"/api/recipes/collections/{created.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.GetAsync($"/api/recipes/collections/{created.Id}")).StatusCode);
        Assert.Equal(6, (await ListAsync(user.Client)).Count);
    }

    [DbFact]
    public async Task Only_the_owner_may_change_a_collection_even_when_it_is_public()
    {
        var owner = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();
        var recipe = (await ListAsync(owner.Client)).First();
        var shared = await CreateCollectionAsync(owner.Client, "Công khai", isPublic: true);
        var secret = await CreateCollectionAsync(owner.Client, "Riêng tư");

        // Bộ sưu tập công khai: người khác xem được nhưng không sửa được (403).
        var view = (await (await other.Client.GetAsync($"/api/recipes/collections/{shared.Id}")).ReadEnvelopeAsync<CollectionPayload>()).Data!;
        Assert.False(view.IsOwner);
        Assert.Equal(owner.Id, view.OwnerId);
        Assert.Equal(HttpStatusCode.Forbidden, (await PatchAsync(other.Client, $"/api/recipes/collections/{shared.Id}", new { name = "Đổi tên" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.Client.DeleteAsync($"/api/recipes/collections/{shared.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.Client.PostJsonAsync($"/api/recipes/collections/{shared.Id}/items", new { recipeId = recipe.Id })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.Client.DeleteAsync($"/api/recipes/collections/{shared.Id}/items/{recipe.Id}")).StatusCode);

        // Bộ sưu tập riêng tư: không lộ sự tồn tại (404).
        Assert.Equal(HttpStatusCode.NotFound, (await other.Client.GetAsync($"/api/recipes/collections/{secret.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.Client.DeleteAsync($"/api/recipes/collections/{secret.Id}")).StatusCode);

        var othersList = (await (await other.Client.GetAsync("/api/recipes/collections")).ReadEnvelopeAsync<List<CollectionPayload>>()).Data!;
        Assert.Contains(othersList, c => c.Id == shared.Id && !c.IsOwner);
        Assert.DoesNotContain(othersList, c => c.Id == secret.Id);

        // Chủ sở hữu vẫn còn nguyên.
        Assert.Equal("Công khai", (await (await owner.Client.GetAsync($"/api/recipes/collections/{shared.Id}")).ReadEnvelopeAsync<CollectionPayload>()).Data!.Name);
    }

    [DbFact]
    public async Task Collection_validation_and_missing_targets_return_proper_errors()
    {
        var user = await _factory.RegisterUserAsync();
        var created = await CreateCollectionAsync(user.Client, "Thử lỗi");

        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.PostJsonAsync("/api/recipes/collections", new { name = "  " })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await PatchAsync(user.Client, $"/api/recipes/collections/{created.Id}", new { name = "" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.PostJsonAsync($"/api/recipes/collections/{created.Id}/items", new { recipeId = Guid.NewGuid() })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.GetAsync($"/api/recipes/collections/{Guid.NewGuid()}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync("/api/recipes/collections")).StatusCode);
    }

    // ───────────────────────────── Thực đơn tự động tôn trọng dị ứng ─────────────────────────────

    [DbFact]
    public async Task Auto_generated_plans_never_contain_my_allergens_and_do_not_fall_back_when_nothing_is_safe()
    {
        var user = await _factory.RegisterUserAsync();
        var recipes = await ListAsync(user.Client);
        await SetAllergiesAsync(user.Client, Seafood, Sesame, 4, 5, 6); // chỉ còn "Cơm gạo lứt bò xào ớt chuông" an toàn
        var safeId = ByTitle(recipes, "Cơm gạo lứt").Id;

        var response = await user.Client.PostJsonAsync("/api/mealplanner/auto-generate", new { startDate = "2026-07-01" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var plan = (await response.ReadEnvelopeAsync<WeeklyPlanPayload>()).Data!;
        Assert.NotEmpty(plan.Days.SelectMany(d => d.Meals));
        Assert.All(plan.Days.SelectMany(d => d.Meals), m => Assert.Equal(safeId, m.RecipeId));
    }

    [DbFact]
    public async Task Auto_generate_creates_nothing_and_says_why_when_no_recipe_is_safe()
    {
        // Factory riêng vì test sửa dữ liệu nguyên liệu: cho "Thịt bò thăn" chứa sữa (3) để món cuối cùng cũng không an toàn.
        await using var factory = new ApiFactory();
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var beef = await db.Ingredients.SingleAsync(i => i.Name.Contains("Thịt bò"));
            db.IngredientAllergies.Add(new IngredientAllergy { IngredientId = beef.Id, AllergyId = 3 });
            await db.SaveChangesAsync();
        }

        var user = await factory.RegisterUserAsync();
        await SetAllergiesAsync(user.Client, Seafood, 3, 4, 5, 6, Sesame);

        var response = await user.Client.PostJsonAsync("/api/mealplanner/auto-generate", new { startDate = "2026-07-01" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var envelope = await response.ReadEnvelopeAsync<WeeklyPlanPayload>();
        Assert.Empty(envelope.Data!.Days.SelectMany(d => d.Meals));
        Assert.Contains("dị ứng", envelope.Message);
    }
}
