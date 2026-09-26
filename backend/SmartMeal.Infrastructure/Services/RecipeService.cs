using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Recipes;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
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

    public async Task<ApiResponse<FavoriteToggleResponseDto>> ToggleFavoriteAsync(Guid userId, Guid recipeId)
    {
        var recipe = await _db.Recipes.FirstOrDefaultAsync(r => r.Id == recipeId);
        if (recipe == null) return ApiResponse<FavoriteToggleResponseDto>.Fail("Không tìm thấy món ăn.");

        var fav = await _db.UserFavorites.FirstOrDefaultAsync(f => f.UserId == userId && f.RecipeId == recipeId);
        bool isFavorite;
        if (fav != null)
        {
            _db.UserFavorites.Remove(fav);
            isFavorite = false;
        }
        else
        {
            await _db.UserFavorites.AddAsync(new UserFavorite { UserId = userId, RecipeId = recipeId });
            isFavorite = true;
        }

        await _db.SaveChangesAsync();
        var total = await _db.UserFavorites.CountAsync(f => f.UserId == userId);

        return ApiResponse<FavoriteToggleResponseDto>.Ok(new FavoriteToggleResponseDto
        {
            IsFavorite = isFavorite,
            TotalFavorites = total
        }, isFavorite ? "Đã lưu vào danh sách yêu thích." : "Đã bỏ khỏi danh sách yêu thích.");
    }

    public async Task<ApiResponse<List<RecipeDto>>> GetFavoritesAsync(Guid userId)
    {
        var favRecipeIds = await _db.UserFavorites.Where(f => f.UserId == userId).Select(f => f.RecipeId).ToListAsync();
        var recipes = await _db.Recipes
            .Include(r => r.RecipeTags).ThenInclude(rt => rt.Tag)
            .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
            .Where(r => favRecipeIds.Contains(r.Id))
            .AsNoTracking()
            .ToListAsync();

        var dtos = recipes.Select(r => new RecipeDto
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

        return ApiResponse<List<RecipeDto>>.Ok(dtos, "Lấy danh sách món ăn yêu thích thành công.");
    }

    public async Task<ApiResponse<List<RecipeCollectionDto>>> GetCollectionsAsync(Guid userId)
    {
        var collections = await _db.RecipeCollections
            .Include(c => c.CollectionRecipes).ThenInclude(cr => cr.Recipe).ThenInclude(r => r.RecipeTags).ThenInclude(rt => rt.Tag)
            .Include(c => c.CollectionRecipes).ThenInclude(cr => cr.Recipe).ThenInclude(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
            .Where(c => c.UserId == userId || c.IsPublic)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var dtos = collections.Select(c => new RecipeCollectionDto
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            CoverImageUrl = c.CoverImageUrl ?? c.CollectionRecipes.FirstOrDefault()?.Recipe.ImageUrl,
            RecipeCount = c.CollectionRecipes.Count,
            IsPublic = c.IsPublic,
            Recipes = c.CollectionRecipes.Select(cr => new RecipeDto
            {
                Id = cr.Recipe.Id,
                Title = cr.Recipe.Title,
                Description = cr.Recipe.Description,
                ImageUrl = cr.Recipe.ImageUrl,
                Instructions = cr.Recipe.Instructions,
                PrepTimeMinutes = cr.Recipe.PrepTimeMinutes,
                CookTimeMinutes = cr.Recipe.CookTimeMinutes,
                Servings = cr.Recipe.Servings,
                Difficulty = cr.Recipe.Difficulty,
                IsPremium = cr.Recipe.IsPremium,
                CaloriesPerServing = cr.Recipe.CaloriesPerServing,
                CarbsPerServing = cr.Recipe.CarbsPerServing,
                FatPerServing = cr.Recipe.FatPerServing,
                ProteinPerServing = cr.Recipe.ProteinPerServing,
                Tags = cr.Recipe.RecipeTags.Select(rt => rt.Tag.Name).ToList(),
                Ingredients = cr.Recipe.RecipeIngredients.Select(ri => new RecipeIngredientDto
                {
                    IngredientId = ri.IngredientId,
                    Name = ri.Ingredient.Name,
                    Amount = ri.Amount,
                    Unit = ri.Unit,
                    EstimatedPriceVnd = ri.Ingredient.EstimatedPriceVnd
                }).ToList()
            }).ToList()
        }).ToList();

        return ApiResponse<List<RecipeCollectionDto>>.Ok(dtos, "Lấy danh sách bộ sưu tập thành công.");
    }

    public async Task<ApiResponse<RecipeCollectionDto>> CreateCollectionAsync(Guid userId, CreateCollectionRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return ApiResponse<RecipeCollectionDto>.Fail("Tên bộ sưu tập không được để trống.");

        var col = new Domain.Entities.RecipeCollection
        {
            UserId = userId,
            Name = dto.Name.Trim(),
            Description = dto.Description,
            CoverImageUrl = dto.CoverImageUrl,
            IsPublic = dto.IsPublic
        };

        await _db.RecipeCollections.AddAsync(col);
        await _db.SaveChangesAsync();

        var resultDto = new RecipeCollectionDto
        {
            Id = col.Id,
            Name = col.Name,
            Description = col.Description,
            CoverImageUrl = col.CoverImageUrl,
            RecipeCount = 0,
            IsPublic = col.IsPublic,
            Recipes = new()
        };

        return ApiResponse<RecipeCollectionDto>.Ok(resultDto, $"Đã tạo bộ sưu tập '{col.Name}'.");
    }

    public async Task<ApiResponse<bool>> AddRecipeToCollectionAsync(Guid userId, Guid collectionId, Guid recipeId)
    {
        var col = await _db.RecipeCollections.FirstOrDefaultAsync(c => c.Id == collectionId && c.UserId == userId);
        if (col == null) return ApiResponse<bool>.Fail("Không tìm thấy bộ sưu tập hoặc bạn không có quyền sửa.");

        var recipe = await _db.Recipes.FirstOrDefaultAsync(r => r.Id == recipeId);
        if (recipe == null) return ApiResponse<bool>.Fail("Không tìm thấy công thức món ăn.");

        var exists = await _db.CollectionRecipes.AnyAsync(cr => cr.CollectionId == collectionId && cr.RecipeId == recipeId);
        if (exists) return ApiResponse<bool>.Ok(true, "Món ăn đã có trong bộ sưu tập.");

        await _db.CollectionRecipes.AddAsync(new Domain.Entities.CollectionRecipe
        {
            CollectionId = collectionId,
            RecipeId = recipeId
        });
        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Đã thêm món ăn vào bộ sưu tập.");
    }
}
