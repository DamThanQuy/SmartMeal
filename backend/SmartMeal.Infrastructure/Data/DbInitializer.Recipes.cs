namespace SmartMeal.Infrastructure.Data;

using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common;
using SmartMeal.Domain.Entities;

public static partial class DbInitializer
{
    private sealed class RecipeSeedJsonItem
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public string Instructions { get; set; } = string.Empty;
        public int PrepTimeMinutes { get; set; }
        public int CookTimeMinutes { get; set; }
        public int Servings { get; set; } = 1;
        public string Difficulty { get; set; } = "Easy";
        public bool IsPremium { get; set; }
        public string MealTypes { get; set; } = "Lunch";
        public double CaloriesPerServing { get; set; }
        public double ProteinPerServing { get; set; }
        public double CarbsPerServing { get; set; }
        public double FatPerServing { get; set; }
        public List<string> TagCodes { get; set; } = new();
        public List<RecipeSeedJsonIngredient> Ingredients { get; set; } = new();
    }

    private sealed class RecipeSeedJsonIngredient
    {
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Unit { get; set; } = "g";
        public double Amount { get; set; }
        public double CaloriesPer100g { get; set; }
        public double ProteinPer100g { get; set; }
        public double CarbsPer100g { get; set; }
        public double FatPer100g { get; set; }
    }

    private static async Task EnsureExpandedRecipesAsync(ApplicationDbContext db)
    {
        // Toàn bộ dữ liệu món ăn được lưu trữ và quản lý trực tiếp trong cơ sở dữ liệu chung (Database).
        // Hàm này chỉ nạp bổ sung từ recipes_seed.json khi khởi tạo database mới hoặc thiếu dữ liệu.
        var existingCount = await db.Recipes.CountAsync();
        if (existingCount >= 50) return;

        var existingTitles = (await db.Recipes.Select(r => r.Title).ToListAsync())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        List<RecipeSeedJsonItem>? seedList = null;

        try
        {
            var assembly = typeof(DbInitializer).Assembly;
            var resourceName = assembly.GetManifestResourceNames()
                .FirstOrDefault(n => n.EndsWith("recipes_seed.json", StringComparison.OrdinalIgnoreCase));

            if (resourceName != null)
            {
                using var stream = assembly.GetManifestResourceStream(resourceName);
                if (stream != null)
                {
                    seedList = await JsonSerializer.DeserializeAsync<List<RecipeSeedJsonItem>>(
                        stream,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                    );
                }
            }

            if (seedList == null)
            {
                var directPath = Path.Combine(AppContext.BaseDirectory, "Data", "recipes_seed.json");
                if (File.Exists(directPath))
                {
                    var json = await File.ReadAllTextAsync(directPath);
                    seedList = JsonSerializer.Deserialize<List<RecipeSeedJsonItem>>(
                        json,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                    );
                }
            }
        }
        catch
        {
            // Fallback an toàn nếu có lỗi IO
        }

        if (seedList == null || seedList.Count == 0) return;

        var tagsByCode = await db.Tags.AsNoTracking().ToDictionaryAsync(t => t.Code, t => t.Id, StringComparer.OrdinalIgnoreCase);
        var existingIngredients = await db.Ingredients.ToListAsync();
        var ingredientCache = existingIngredients
            .GroupBy(i => i.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        Ingredient GetOrCreateIngredient(string name, string category, string unit, double cal, double pro, double carbs, double fat)
        {
            if (ingredientCache.TryGetValue(name, out var existing)) return existing;
            var ing = new Ingredient
            {
                Name = name,
                Category = category,
                DefaultUnit = unit,
                CaloriesPer100g = cal,
                ProteinPer100g = pro,
                CarbsPer100g = carbs,
                FatPer100g = fat,
                IsVerified = true,
                SearchText = TextNormalizer.Fold(name).Trim()
            };
            db.Ingredients.Add(ing);
            ingredientCache[name] = ing;
            return ing;
        }

        var newRecipes = new List<Recipe>();
        var newRecipeTags = new List<RecipeTag>();
        var newRecipeIngredients = new List<RecipeIngredient>();

        foreach (var seed in seedList)
        {
            if (existingTitles.Contains(seed.Title)) continue;

            var recipe = new Recipe
            {
                Title = seed.Title,
                Description = seed.Description,
                ImageUrl = seed.ImageUrl,
                Instructions = seed.Instructions,
                PrepTimeMinutes = seed.PrepTimeMinutes,
                CookTimeMinutes = seed.CookTimeMinutes,
                Servings = seed.Servings,
                Difficulty = seed.Difficulty,
                IsPremium = seed.IsPremium,
                MealTypes = seed.MealTypes,
                CaloriesPerServing = seed.CaloriesPerServing,
                ProteinPerServing = seed.ProteinPerServing,
                CarbsPerServing = seed.CarbsPerServing,
                FatPerServing = seed.FatPerServing,
                CreatedAt = DateTime.UtcNow
            };

            newRecipes.Add(recipe);

            foreach (var tagCode in seed.TagCodes)
            {
                if (tagsByCode.TryGetValue(tagCode, out var tagId))
                {
                    newRecipeTags.Add(new RecipeTag { RecipeId = recipe.Id, TagId = tagId });
                }
            }

            foreach (var ingDef in seed.Ingredients)
            {
                var ing = GetOrCreateIngredient(ingDef.Name, ingDef.Category, ingDef.Unit, ingDef.CaloriesPer100g, ingDef.ProteinPer100g, ingDef.CarbsPer100g, ingDef.FatPer100g);
                newRecipeIngredients.Add(new RecipeIngredient
                {
                    RecipeId = recipe.Id,
                    IngredientId = ing.Id,
                    Amount = ingDef.Amount,
                    Unit = ingDef.Unit
                });
            }
        }

        if (newRecipes.Count > 0)
        {
            await db.Recipes.AddRangeAsync(newRecipes);
            await db.RecipeTags.AddRangeAsync(newRecipeTags);
            await db.RecipeIngredients.AddRangeAsync(newRecipeIngredients);
            await db.SaveChangesAsync();
        }
    }
}
