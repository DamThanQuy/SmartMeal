using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Application.Common;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>
/// Chất lượng dữ liệu công thức được seed (6 món gốc + danh sách món mở rộng ở DbInitializer.Recipes.cs):
/// seed chạy lại không nhân đôi, nhãn/thời gian/dinh dưỡng nhất quán và chất gây dị ứng có trong tên món
/// phải được báo ở danh sách dị ứng của món (BR-090, BR-100, BR-102).
/// </summary>
public class RecipeSeedQualityTests : IClassFixture<ApiFactory>
{
    private static readonly string[] KnownMealTypes = { "Breakfast", "Lunch", "Dinner", "Snack" };
    private static readonly string[] KnownDifficulties = { "Easy", "Medium", "Hard" };

    // Sữa thực vật không phải sữa động vật (dairy) — bỏ chữ "sữa" để từ khóa "sữa" không khớp nhầm.
    private static readonly (string Phrase, string Replacement)[] PlantMilks =
    {
        ("sữa dừa", "dừa"), ("sữa hạnh nhân", "hạnh nhân"), ("sữa hạt", "hạt"), ("sữa yến mạch", "yến mạch")
    };

    private readonly ApiFactory _factory;

    public RecipeSeedQualityTests(ApiFactory factory) => _factory = factory;

    private static async Task<List<RecipePayload>> ListAsync(HttpClient client, string query = "")
    {
        var response = await client.GetAsync("/api/recipes" + query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<List<RecipePayload>>()).Data!;
    }

    private Task<Dictionary<string, int>> AllergyIdsByCodeAsync() => AllergyIdsByCodeAsync(_factory);

    private static async Task<Dictionary<string, int>> AllergyIdsByCodeAsync(ApiFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.Allergies.AsNoTracking().ToDictionaryAsync(a => a.Code, a => a.Id, StringComparer.OrdinalIgnoreCase);
    }

    private static string WithoutPlantMilks(string title) =>
        PlantMilks.Aggregate(title, (text, milk) => text.Replace(milk.Phrase, milk.Replacement, StringComparison.OrdinalIgnoreCase));

    /// <summary>Mã dị ứng mà tên món nhắc tới (theo cùng bộ từ khóa backend dùng để gắn dị ứng cho nguyên liệu).</summary>
    private static List<string> AllergensNamedIn(string title, IEnumerable<string> codes) =>
        AllergenKeywords.FindMatches(WithoutPlantMilks(title), codes);

    /// <summary>Như Assert.Empty nhưng in đủ mọi vi phạm (Assert.Empty cắt danh sách dài bằng "···").</summary>
    private static void AssertNoViolations(IReadOnlyCollection<string> violations) =>
        Assert.True(violations.Count == 0, $"{violations.Count} vi phạm:\n" + string.Join("\n", violations));

    // ───────────────────────────── Seed ─────────────────────────────

    [DbFact]
    public async Task Seeding_again_adds_no_duplicate_recipes_or_ingredients()
    {
        _factory.CreateClient(); // khởi động API (migration + seed lần đầu)

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var recipesBefore = await db.Recipes.CountAsync();
        var ingredientsBefore = await db.Ingredients.CountAsync();
        var linksBefore = await db.RecipeIngredients.CountAsync();

        await DbInitializer.SeedAsync(db);

        Assert.True(recipesBefore > 6, "Danh sách món mở rộng phải được seed thêm vào 6 món gốc");
        Assert.Equal(recipesBefore, await db.Recipes.CountAsync());
        Assert.Equal(ingredientsBefore, await db.Ingredients.CountAsync());
        Assert.Equal(linksBefore, await db.RecipeIngredients.CountAsync());

        var titles = await db.Recipes.Select(r => r.Title).ToListAsync();
        Assert.Empty(titles.GroupBy(t => t, StringComparer.OrdinalIgnoreCase).Where(g => g.Count() > 1).Select(g => g.Key));
        var ingredientNames = await db.Ingredients.Select(i => i.Name).ToListAsync();
        Assert.Empty(ingredientNames.GroupBy(n => n, StringComparer.OrdinalIgnoreCase).Where(g => g.Count() > 1).Select(g => g.Key));
    }

    [DbFact]
    public async Task The_data_fix_migration_repairs_recipes_seeded_by_the_first_expanded_list()
    {
        const string peanutDish = "Bún bò xào Nam Bộ rau sống đậu phộng";
        const string peanut = "Đậu phộng rang";
        const string slowDish = "Canh chua cá lóc rau muống bắp chuối";
        const string quickDish = "Salad cá ngừ áp chảo sốt mù tạt mật ong"; // 13 phút, nhãn "quick" đúng

        // Factory riêng vì test sửa dữ liệu: dựng lại DB đã seed bằng bản đầu của danh sách món mở rộng — chưa có nguyên
        // liệu đậu phộng nên món "... đậu phộng" không báo dị ứng, và món nấu 30 phút vẫn mang nhãn "quick".
        await using var factory = new ApiFactory();
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.RecipeIngredients.Where(ri => ri.Ingredient.Name == peanut).ExecuteDeleteAsync();
            await db.IngredientAllergies.Where(ia => ia.Ingredient.Name == peanut).ExecuteDeleteAsync();
            await db.Ingredients.Where(i => i.Name == peanut).ExecuteDeleteAsync();
            var slowId = await db.Recipes.Where(r => r.Title == slowDish).Select(r => r.Id).SingleAsync();
            var quickId = await db.Tags.Where(t => t.Code == "quick").Select(t => t.Id).SingleAsync();
            db.RecipeTags.Add(new SmartMeal.Domain.Entities.RecipeTag { RecipeId = slowId, TagId = quickId });
            await db.SaveChangesAsync();
        }

        var before = await ListAsync(factory.CreateClient());
        var peanutId = (await AllergyIdsByCodeAsync(factory))["peanut"];
        Assert.DoesNotContain(peanutId, before.Single(r => r.Title == peanutDish).AllergyIds);
        Assert.Contains("quick", before.Single(r => r.Title == slowDish).TagCodes);

        // Chạy bản sửa hai lần (chạy lại không thêm gì), rồi khởi động lại như máy chủ: seed gắn dị ứng cho nguyên liệu mới.
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.Database.ExecuteSqlRawAsync(ExpandedRecipeDataFix.Sql);
            await db.Database.ExecuteSqlRawAsync(ExpandedRecipeDataFix.Sql);
            await DbInitializer.SeedAsync(db);

            Assert.Equal(1, await db.Ingredients.CountAsync(i => i.Name == peanut));
            Assert.Equal(1, await db.RecipeIngredients.CountAsync(ri => ri.Recipe.Title == peanutDish && ri.Ingredient.Name == peanut));
        }

        var after = await ListAsync(factory.CreateClient());
        Assert.Contains(peanutId, after.Single(r => r.Title == peanutDish).AllergyIds);
        Assert.DoesNotContain("quick", after.Single(r => r.Title == slowDish).TagCodes);
        Assert.Contains("quick", after.Single(r => r.Title == quickDish).TagCodes);
    }

    [DbFact]
    public async Task Every_seeded_recipe_has_ingredients_tags_and_values_the_app_understands()
    {
        var recipes = await ListAsync(_factory.CreateClient());

        Assert.All(recipes, r =>
        {
            Assert.NotEmpty(r.Ingredients);
            Assert.NotEmpty(r.TagCodes);
            Assert.NotEmpty(r.MealTypes);
            Assert.All(r.MealTypes, m => Assert.Contains(m, KnownMealTypes));
            Assert.Contains(r.Difficulty, KnownDifficulties);
            Assert.True(r.Servings >= 1, $"{r.Title}: Servings = {r.Servings}");
            Assert.False(string.IsNullOrWhiteSpace(r.Instructions), $"{r.Title}: thiếu hướng dẫn nấu");
            Assert.StartsWith("https://", r.ImageUrl);
            Assert.All(r.Ingredients, i => Assert.True(i.Amount > 0, $"{r.Title} / {i.Name}: Amount = {i.Amount}"));
        });
    }

    [DbFact]
    public async Task Calories_per_serving_agree_with_the_macros_within_20_percent()
    {
        var recipes = await ListAsync(_factory.CreateClient());

        // 1 g đạm/tinh bột = 4 kcal, 1 g béo = 9 kcal.
        var inconsistent = recipes
            .Select(r => (r.Title, r.CaloriesPerServing, FromMacros: 4 * r.ProteinPerServing + 4 * r.CarbsPerServing + 9 * r.FatPerServing))
            .Where(x => Math.Abs(x.FromMacros - x.CaloriesPerServing) > 0.2 * x.CaloriesPerServing)
            .Select(x => $"{x.Title}: {x.CaloriesPerServing} kcal ≠ {x.FromMacros:0} kcal từ macro")
            .ToList();

        AssertNoViolations(inconsistent);
    }

    [DbFact]
    public async Task Recipes_tagged_quick_take_at_most_15_minutes()
    {
        var recipes = await ListAsync(_factory.CreateClient());

        // Tag "quick" = "Nhanh Gọn (< 15 phút)"; FE (recipe.types.ts) cũng hiểu là ≤ 15 phút.
        var tooSlow = recipes
            .Where(r => r.TagCodes.Contains("quick") && r.TotalTimeMinutes > 15)
            .Select(r => $"{r.Title}: {r.TotalTimeMinutes} phút")
            .ToList();

        AssertNoViolations(tooSlow);
    }

    [DbFact]
    public async Task Vegan_recipes_have_no_animal_ingredients_and_vegetarian_ones_have_no_meat_or_seafood()
    {
        _factory.CreateClient();
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var rows = await db.RecipeTags
            .Where(rt => rt.Tag.Code == "vegan" || rt.Tag.Code == "vegetarian")
            .SelectMany(rt => rt.Recipe.RecipeIngredients.Select(ri => new
            {
                Tag = rt.Tag.Code,
                rt.Recipe.Title,
                Ingredient = ri.Ingredient.Name,
                ri.Ingredient.Category
            }))
            .ToListAsync();

        var violations = rows
            .Where(x => x.Category is "Meat" or "Seafood"
                        || (x.Tag == "vegan" && (x.Category == "Dairy" || x.Ingredient.Contains("trứng", StringComparison.OrdinalIgnoreCase))))
            .Select(x => $"{x.Title} [{x.Tag}] chứa {x.Ingredient} ({x.Category})")
            .Distinct()
            .ToList();

        Assert.NotEmpty(rows);
        AssertNoViolations(violations);
    }

    // ───────────────────────────── Dị ứng (BR-102) ─────────────────────────────

    [DbFact]
    public async Task An_allergen_named_in_the_title_is_reported_in_the_recipe_allergy_list()
    {
        var idByCode = await AllergyIdsByCodeAsync();
        var recipes = await ListAsync(_factory.CreateClient());

        var missing = recipes
            .SelectMany(r => AllergensNamedIn(r.Title, idByCode.Keys)
                .Where(code => !r.AllergyIds.Contains(idByCode[code]))
                .Select(code => $"{r.Title}: tên món có '{code}' nhưng AllergyIds = [{string.Join(", ", r.AllergyIds)}]"))
            .ToList();

        AssertNoViolations(missing);
    }

    [DbFact]
    public async Task Excluding_my_allergens_hides_dishes_whose_name_mentions_one_of_them()
    {
        var idByCode = await AllergyIdsByCodeAsync();
        string[] mine = { "seafood", "peanut", "treeNut", "dairy" };
        var user = await _factory.RegisterUserAsync();
        var survey = await user.Client.PostJsonAsync("/api/healthprofile/survey", new
        {
            gender = "Female",
            age = 28,
            heightCm = 160,
            currentWeightKg = 55,
            targetWeightKg = 52,
            activityLevel = "Moderate",
            goal = "LoseWeight",
            allergyIds = mine.Select(code => idByCode[code]).ToArray(),
            medicalConditionIds = Array.Empty<int>(),
            dietaryPreferenceIds = Array.Empty<int>()
        });
        survey.EnsureSuccessStatusCode();

        var safe = await ListAsync(user.Client, "?excludeMyAllergens=true");

        var unsafeShown = safe
            .Select(r => (r.Title, Codes: AllergensNamedIn(r.Title, mine)))
            .Where(x => x.Codes.Count > 0)
            .Select(x => $"{x.Title} ({string.Join(", ", x.Codes)})")
            .ToList();

        Assert.NotEmpty(safe);
        AssertNoViolations(unsafeShown);
    }
}
