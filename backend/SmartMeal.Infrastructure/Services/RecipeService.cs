using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Recipes;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class RecipeService : IRecipeService
{
    private readonly ApplicationDbContext _db;

    public RecipeService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponse<List<RecipeDto>>> GetRecipesAsync(string? search, string? tag, string? difficulty, int? maxCalories)
    {
        var query = _db.Recipes
            .Include(r => r.RecipeTags).ThenInclude(rt => rt.Tag)
            .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(r => r.Title.ToLower().Contains(s) || (r.Description != null && r.Description.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var t = tag.Trim().ToLower();
            query = query.Where(r => r.RecipeTags.Any(rt => rt.Tag.Name.ToLower() == t));
        }

        if (!string.IsNullOrWhiteSpace(difficulty))
        {
            query = query.Where(r => r.Difficulty.ToLower() == difficulty.ToLower());
        }

        if (maxCalories.HasValue && maxCalories.Value > 0)
        {
            query = query.Where(r => r.CaloriesPerServing <= maxCalories.Value);
        }

        var list = await query.ToListAsync();

        var result = list.Select(r => new RecipeDto
        {
            Id = r.Id,
            Title = r.Title,
            Description = r.Description,
            ImageUrl = r.ImageUrl,
            Instructions = r.Instructions,
            PrepTimeMinutes = r.PrepTimeMinutes,
            CookTimeMinutes = r.CookTimeMinutes,
            Servings = r.Servings,
            Difficulty = r.Difficulty,
            IsPremium = r.IsPremium,
            CaloriesPerServing = r.CaloriesPerServing,
            CarbsPerServing = r.CarbsPerServing,
            FatPerServing = r.FatPerServing,
            ProteinPerServing = r.ProteinPerServing,
            Tags = r.RecipeTags.Select(rt => rt.Tag.Name).ToList(),
            Ingredients = r.RecipeIngredients.Select(ri => new RecipeIngredientDto
            {
                IngredientId = ri.IngredientId,
                Name = ri.Ingredient.Name,
                Amount = ri.Amount,
                Unit = ri.Unit,
                EstimatedPriceVnd = ri.Ingredient.EstimatedPriceVnd
            }).ToList()
        }).ToList();

        return ApiResponse<List<RecipeDto>>.Ok(result);
    }

    public async Task<ApiResponse<RecipeDto>> GetRecipeByIdAsync(Guid id)
    {
        var r = await _db.Recipes
            .Include(r => r.RecipeTags).ThenInclude(rt => rt.Tag)
            .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);

        if (r == null) return ApiResponse<RecipeDto>.Fail("Không tìm thấy công thức món ăn.");

        var dto = new RecipeDto
        {
            Id = r.Id,
            Title = r.Title,
            Description = r.Description,
            ImageUrl = r.ImageUrl,
            Instructions = r.Instructions,
            PrepTimeMinutes = r.PrepTimeMinutes,
            CookTimeMinutes = r.CookTimeMinutes,
            Servings = r.Servings,
            Difficulty = r.Difficulty,
            IsPremium = r.IsPremium,
            CaloriesPerServing = r.CaloriesPerServing,
            CarbsPerServing = r.CarbsPerServing,
            FatPerServing = r.FatPerServing,
            ProteinPerServing = r.ProteinPerServing,
            Tags = r.RecipeTags.Select(rt => rt.Tag.Name).ToList(),
            Ingredients = r.RecipeIngredients.Select(ri => new RecipeIngredientDto
            {
                IngredientId = ri.IngredientId,
                Name = ri.Ingredient.Name,
                Amount = ri.Amount,
                Unit = ri.Unit,
                EstimatedPriceVnd = ri.Ingredient.EstimatedPriceVnd
            }).ToList()
        };

        return ApiResponse<RecipeDto>.Ok(dto);
    }

    public async Task<ApiResponse<List<RecipeDto>>> SuggestByPantryAsync(PantrySuggestionRequestDto dto)
    {
        var availableNames = dto.AvailableIngredients
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToLower())
            .ToList();

        if (!availableNames.Any())
        {
            return ApiResponse<List<RecipeDto>>.Fail("Vui lòng cung cấp ít nhất 1 nguyên liệu.");
        }

        var recipes = await _db.Recipes
            .Include(r => r.RecipeTags).ThenInclude(rt => rt.Tag)
            .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
            .AsNoTracking()
            .ToListAsync();

        // Rank recipes by how many available ingredients match
        var ranked = recipes
            .Select(r => new
            {
                Recipe = r,
                MatchCount = r.RecipeIngredients.Count(ri => availableNames.Any(name => ri.Ingredient.Name.ToLower().Contains(name)))
            })
            .Where(x => x.MatchCount > 0)
            .OrderByDescending(x => x.MatchCount)
            .Take(10)
            .Select(x => new RecipeDto
            {
                Id = x.Recipe.Id,
                Title = x.Recipe.Title,
                Description = x.Recipe.Description,
                ImageUrl = x.Recipe.ImageUrl,
                Instructions = x.Recipe.Instructions,
                PrepTimeMinutes = x.Recipe.PrepTimeMinutes,
                CookTimeMinutes = x.Recipe.CookTimeMinutes,
                Servings = x.Recipe.Servings,
                Difficulty = x.Recipe.Difficulty,
                IsPremium = x.Recipe.IsPremium,
                CaloriesPerServing = x.Recipe.CaloriesPerServing,
                CarbsPerServing = x.Recipe.CarbsPerServing,
                FatPerServing = x.Recipe.FatPerServing,
                ProteinPerServing = x.Recipe.ProteinPerServing,
                Tags = x.Recipe.RecipeTags.Select(rt => rt.Tag.Name).ToList(),
                Ingredients = x.Recipe.RecipeIngredients.Select(ri => new RecipeIngredientDto
                {
                    IngredientId = ri.IngredientId,
                    Name = ri.Ingredient.Name,
                    Amount = ri.Amount,
                    Unit = ri.Unit,
                    EstimatedPriceVnd = ri.Ingredient.EstimatedPriceVnd
                }).ToList()
            })
            .ToList();

        return ApiResponse<List<RecipeDto>>.Ok(ranked, "Đề xuất món ăn dựa trên tủ lạnh thành công.");
    }
}
