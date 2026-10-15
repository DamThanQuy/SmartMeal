using System.Net;
using SmartMeal.Application.Common;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>"Dị ứng khác" tự nhập (vd. "dứa, kiwi"): lưu theo hồ sơ, loại món khỏi gợi ý/thực đơn và cảnh báo (BR-101/102).</summary>
public class OtherAllergiesTests : IClassFixture<ApiFactory>
{
    private const string BellPepperRecipe = "Cơm gạo lứt bò xào ớt chuông";

    private readonly ApiFactory _factory;

    public OtherAllergiesTests(ApiFactory factory) => _factory = factory;

    private static object Survey(string? otherAllergies) => new
    {
        gender = "Male",
        age = 30,
        heightCm = 175,
        currentWeightKg = 70,
        targetWeightKg = 65,
        activityLevel = "Moderate",
        goal = "LoseWeight",
        allergyIds = Array.Empty<int>(),
        medicalConditionIds = Array.Empty<int>(),
        dietaryPreferenceIds = Array.Empty<int>(),
        otherAllergies
    };

    private static async Task<HealthProfilePayload> ProfileFrom(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<HealthProfilePayload>()).Data!;
    }

    private static async Task<List<RecipePayload>> RecipesAsync(HttpClient client, string query = "")
    {
        var response = await client.GetAsync("/api/recipes" + query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<List<RecipePayload>>()).Data!;
    }

    [Fact]
    public void Keywords_match_whole_words_and_respect_diacritics()
    {
        Assert.Equal("dứa, kiwi", CustomAllergens.Normalize("  dứa ;kiwi,, Dứa , x "));
        Assert.Null(CustomAllergens.Normalize(" , ; "));

        var withMarks = CustomAllergens.Keywords("Dứa, kiwi");
        Assert.Equal(new[] { "dứa", "kiwi" }, withMarks);
        Assert.Equal("dứa", CustomAllergens.FindMatch(withMarks, new[] { "Cơm chiên dứa" }));
        // Có dấu thì khớp đúng dấu: "dứa" (thơm) không phải "dưa" (dưa leo); "kiwi" không khớp giữa một từ khác.
        Assert.Null(CustomAllergens.FindMatch(withMarks, new[] { "Dưa leo", "Kiwifruit" }));

        // Gõ không dấu thì thận trọng: khớp mọi cách viết có dấu.
        Assert.Equal("dua", CustomAllergens.FindMatch(CustomAllergens.Keywords("dua"), new[] { "Dưa leo" }));
        // Ranh giới từ hiểu chữ có dấu: "cá" không khớp "các".
        Assert.Null(CustomAllergens.FindMatch(CustomAllergens.Keywords("cá"), new[] { "Các loại rau" }));
    }

    [DbFact]
    public async Task Survey_stores_other_allergies_and_put_changes_keeps_or_clears_them()
    {
        var user = await _factory.RegisterUserAsync();

        var created = await ProfileFrom(await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey("  ớt chuông ; dứa ")));
        Assert.Equal("ớt chuông, dứa", created.OtherAllergies);

        var changed = await ProfileFrom(await user.Client.PutJsonAsync("/api/healthprofile", new { otherAllergies = "kiwi" }));
        Assert.Equal("kiwi", changed.OtherAllergies);

        var untouched = await ProfileFrom(await user.Client.PutJsonAsync("/api/healthprofile", new { heightCm = 176 }));
        Assert.Equal("kiwi", untouched.OtherAllergies);

        var cleared = await ProfileFrom(await user.Client.PutJsonAsync("/api/healthprofile", new { otherAllergies = "" }));
        Assert.Null(cleared.OtherAllergies);

        var tooLong = await user.Client.PutJsonAsync("/api/healthprofile", new { otherAllergies = new string('a', 201) });
        Assert.Equal(HttpStatusCode.BadRequest, tooLong.StatusCode);
    }

    [DbFact]
    public async Task Recipes_pantry_planner_and_detail_respect_other_allergies()
    {
        var user = await _factory.RegisterUserAsync();
        // Gõ không dấu vẫn phải khớp "Ớt chuông đỏ".
        await ProfileFrom(await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey("ot chuong")));

        var all = await RecipesAsync(user.Client);
        var target = all.Single(r => r.Title == BellPepperRecipe);
        var withPepper = all
            .Where(r => r.Ingredients.Any(i => i.Name.StartsWith("Ớt chuông", StringComparison.Ordinal)))
            .Select(r => r.Id)
            .ToList();
        Assert.Contains(target.Id, withPepper);

        var safe = await RecipesAsync(user.Client, "?excludeMyAllergens=true");
        Assert.Equal(all.Count - withPepper.Count, safe.Count);
        Assert.DoesNotContain(safe, r => withPepper.Contains(r.Id));

        var detail = await user.Client.GetAsync($"/api/recipes/{target.Id}");
        Assert.Contains((await detail.ReadEnvelopeAsync<RecipePayload>()).Data!.HealthWarnings, w => w.Contains("ot chuong"));

        var pantry = await user.Client.PostJsonAsync("/api/recipes/suggest-by-pantry", new { availableIngredients = new[] { "Ớt chuông", "Thịt bò" } });
        Assert.Equal(HttpStatusCode.OK, pantry.StatusCode);
        Assert.DoesNotContain((await pantry.ReadEnvelopeAsync<List<RecipePayload>>()).Data!, r => r.Id == target.Id);

        var assign = await user.Client.PostJsonAsync("/api/mealplanner/assign",
            new { planDate = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd"), mealType = "Lunch", recipeId = target.Id });
        Assert.Equal(HttpStatusCode.BadRequest, assign.StatusCode);
        Assert.Contains("allergen_conflict", (await assign.ReadEnvelopeAsync<object>()).Errors!);
    }

    [DbFact]
    public async Task A_keyword_that_matches_nothing_changes_nothing()
    {
        var user = await _factory.RegisterUserAsync();
        // "dứa" có dấu không được loại các món có "Dưa leo".
        await ProfileFrom(await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey("dứa")));

        Assert.Equal((await RecipesAsync(user.Client)).Count, (await RecipesAsync(user.Client, "?excludeMyAllergens=true")).Count);
    }
}
