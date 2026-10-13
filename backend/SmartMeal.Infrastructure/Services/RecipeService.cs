using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Recipes;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class RecipeService : IRecipeService
{
    private const int MaxPageSize = 50;
    private const int DefaultPageSize = 10;

    private readonly ApplicationDbContext _db;

    public RecipeService(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>Công thức kèm tag, nguyên liệu và chất gây dị ứng của từng nguyên liệu.</summary>
    private IQueryable<Recipe> RecipesWithDetails() => _db.Recipes
        .AsNoTracking()
        .Include(r => r.RecipeTags).ThenInclude(rt => rt.Tag)
        .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient).ThenInclude(i => i.IngredientAllergies)
        .AsSplitQuery();

    // ───────────────────────────── Danh sách / chi tiết ─────────────────────────────

    public async Task<ApiResponse<PagedResult<RecipeDto>>> GetRecipesAsync(RecipeQuery query, Guid? userId)
    {
        var mealType = (string?)null;
        if (!string.IsNullOrWhiteSpace(query.MealType))
        {
            mealType = MealTypes.Normalize(query.MealType);
            if (mealType is null)
            {
                return ApiResponse<PagedResult<RecipeDto>>.Fail("mealType phải là một trong các giá trị: Breakfast, Lunch, Dinner, Snack.");
            }
        }

        var recipes = RecipesWithDetails();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            // Tìm không phân biệt hoa/thường và dấu tiếng Việt ("pho bo" khớp "Phở bò"). Danh mục công thức nhỏ nên
            // lọc theo Id trong bộ nhớ thay vì phụ thuộc extension unaccent của PostgreSQL.
            var needle = TextNormalizer.Fold(query.Search);
            var titles = await _db.Recipes.AsNoTracking().Select(r => new { r.Id, r.Title, r.Description }).ToListAsync();
            var matchingIds = titles
                .Where(r => TextNormalizer.Fold(r.Title).Contains(needle) || TextNormalizer.Fold(r.Description).Contains(needle))
                .Select(r => r.Id)
                .ToList();
            recipes = recipes.Where(r => matchingIds.Contains(r.Id));
        }

        if (!string.IsNullOrWhiteSpace(query.Tag))
        {
            var t = query.Tag.Trim().ToLower();
            recipes = recipes.Where(r => r.RecipeTags.Any(rt => rt.Tag.Name.ToLower() == t || rt.Tag.Code.ToLower() == t));
        }

        if (!string.IsNullOrWhiteSpace(query.Difficulty))
        {
            var d = query.Difficulty.Trim().ToLower();
            recipes = recipes.Where(r => r.Difficulty.ToLower() == d);
        }

        if (query.MaxCalories is > 0)
        {
            recipes = recipes.Where(r => r.CaloriesPerServing <= query.MaxCalories.Value);
        }

        if (query.MaxTotalMinutes is > 0)
        {
            recipes = recipes.Where(r => r.PrepTimeMinutes + r.CookTimeMinutes <= query.MaxTotalMinutes.Value);
        }

        if (mealType is not null)
        {
            // MealTypes rỗng = phù hợp mọi bữa.
            recipes = recipes.Where(r => r.MealTypes == "" || r.MealTypes.Contains(mealType));
        }

        if (query.ExcludeMyAllergens && userId is { } allergyOwner)
        {
            var allergyIds = await GetUserAllergyIdsAsync(allergyOwner);
            if (allergyIds.Count > 0)
            {
                recipes = recipes.Where(r => !r.RecipeIngredients.Any(ri => ri.Ingredient.IngredientAllergies.Any(a => allergyIds.Contains(a.AllergyId))));
            }
        }

        var total = await recipes.CountAsync();
        var ordered = recipes.OrderBy(r => r.Title).ThenBy(r => r.Id);

        // Không gửi page/pageSize = trả tất cả (giữ tương thích với client cũ).
        var paged = query.Page is not null || query.PageSize is not null;
        var page = paged ? Math.Max(1, query.Page ?? 1) : 1;
        var pageSize = paged ? Math.Clamp(query.PageSize ?? DefaultPageSize, 1, MaxPageSize) : Math.Max(total, 1);

        var list = paged
            ? await ordered.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync()
            : await ordered.ToListAsync();

        var favorites = await GetFavoriteIdsAsync(userId);
        return ApiResponse<PagedResult<RecipeDto>>.Ok(new PagedResult<RecipeDto>
        {
            Items = list.Select(r => ToDto(r, favorites)).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total
        });
    }

    public async Task<ApiResponse<RecipeDto>> GetRecipeByIdAsync(Guid id, Guid? userId)
    {
        var r = await RecipesWithDetails().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return ApiResponse<RecipeDto>.Fail("Không tìm thấy công thức món ăn.", null, ApiErrorKind.NotFound);

        return ApiResponse<RecipeDto>.Ok(ToDto(r, await GetFavoriteIdsAsync(userId)));
    }

    public async Task<ApiResponse<List<RecipeDto>>> SuggestByPantryAsync(PantrySuggestionRequestDto dto, Guid? userId)
    {
        var availableNames = dto.AvailableIngredients
            .Select(TextNormalizer.Fold)
            .Where(x => x.Length > 0)
            .Distinct()
            .ToList();

        if (availableNames.Count == 0)
        {
            return ApiResponse<List<RecipeDto>>.Fail("Vui lòng cung cấp ít nhất 1 nguyên liệu.");
        }

        var recipes = await RecipesWithDetails().ToListAsync();

        // Có người dùng: bỏ hẳn công thức chứa chất gây dị ứng của họ, không bao giờ "tạm chấp nhận" (BR-102).
        var userAllergies = userId is { } id ? await GetUserAllergyIdsAsync(id) : new HashSet<int>();
        if (userAllergies.Count > 0)
        {
            recipes = recipes.Where(r => !ContainsAnyAllergen(r, userAllergies)).ToList();
        }

        var ranked = recipes
            .Select(r => new
            {
                Recipe = r,
                MatchCount = r.RecipeIngredients.Count(ri =>
                {
                    var ingredient = TextNormalizer.Fold(ri.Ingredient.Name);
                    return availableNames.Any(name => ingredient.Contains(name));
                })
            })
            .Where(x => x.MatchCount > 0)
            .OrderByDescending(x => x.MatchCount)
            .ThenBy(x => x.Recipe.Title)
            .Take(10)
            .Select(x => x.Recipe)
            .ToList();

        var favorites = await GetFavoriteIdsAsync(userId);
        var message = ranked.Count > 0
            ? "Đề xuất món ăn dựa trên tủ lạnh thành công."
            : userAllergies.Count > 0
                ? "Không có món nào phù hợp với nguyên liệu này mà không chứa chất gây dị ứng của bạn."
                : "Chưa có món nào dùng các nguyên liệu này.";
        return ApiResponse<List<RecipeDto>>.Ok(ranked.Select(r => ToDto(r, favorites)).ToList(), message);
    }

    // ───────────────────────────── Yêu thích ─────────────────────────────

    public async Task<ApiResponse<FavoriteToggleResponseDto>> ToggleFavoriteAsync(Guid userId, Guid recipeId)
    {
        var recipe = await _db.Recipes.FirstOrDefaultAsync(r => r.Id == recipeId);
        if (recipe == null) return ApiResponse<FavoriteToggleResponseDto>.Fail("Không tìm thấy món ăn.", null, ApiErrorKind.NotFound);

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
        var recipes = await RecipesWithDetails()
            .Where(r => favRecipeIds.Contains(r.Id))
            .OrderBy(r => r.Title)
            .ToListAsync();

        var favorites = favRecipeIds.ToHashSet();
        return ApiResponse<List<RecipeDto>>.Ok(recipes.Select(r => ToDto(r, favorites)).ToList(), "Lấy danh sách món ăn yêu thích thành công.");
    }

    // ───────────────────────────── Bộ sưu tập ─────────────────────────────

    public async Task<ApiResponse<List<RecipeCollectionDto>>> GetCollectionsAsync(Guid userId)
    {
        var collections = await CollectionsWithRecipes()
            .Where(c => c.UserId == userId || c.IsPublic)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var favorites = await GetFavoriteIdsAsync(userId);
        return ApiResponse<List<RecipeCollectionDto>>.Ok(
            collections.Select(c => ToCollectionDto(c, userId, favorites)).ToList(),
            "Lấy danh sách bộ sưu tập thành công.");
    }

    public async Task<ApiResponse<RecipeCollectionDto>> GetCollectionAsync(Guid userId, Guid collectionId)
    {
        var collection = await CollectionsWithRecipes().FirstOrDefaultAsync(c => c.Id == collectionId && (c.UserId == userId || c.IsPublic));
        if (collection is null)
        {
            return ApiResponse<RecipeCollectionDto>.Fail("Không tìm thấy bộ sưu tập.", null, ApiErrorKind.NotFound);
        }

        return ApiResponse<RecipeCollectionDto>.Ok(ToCollectionDto(collection, userId, await GetFavoriteIdsAsync(userId)));
    }

    public async Task<ApiResponse<RecipeCollectionDto>> CreateCollectionAsync(Guid userId, CreateCollectionRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return ApiResponse<RecipeCollectionDto>.Fail("Tên bộ sưu tập không được để trống.");

        var col = new RecipeCollection
        {
            UserId = userId,
            Name = dto.Name.Trim(),
            Description = dto.Description,
            CoverImageUrl = dto.CoverImageUrl,
            IsPublic = dto.IsPublic
        };

        await _db.RecipeCollections.AddAsync(col);
        await _db.SaveChangesAsync();

        return ApiResponse<RecipeCollectionDto>.Ok(new RecipeCollectionDto
        {
            Id = col.Id,
            Name = col.Name,
            Description = col.Description,
            CoverImageUrl = col.CoverImageUrl,
            RecipeCount = 0,
            IsPublic = col.IsPublic,
            OwnerId = userId,
            IsOwner = true,
            Recipes = new()
        }, $"Đã tạo bộ sưu tập '{col.Name}'.");
    }

    public async Task<ApiResponse<RecipeCollectionDto>> UpdateCollectionAsync(Guid userId, Guid collectionId, UpdateCollectionRequestDto dto)
    {
        var (collection, error) = await FindOwnedCollectionAsync<RecipeCollectionDto>(userId, collectionId);
        if (collection is null) return error!;

        var name = dto.Name?.Trim();
        if (name is { Length: 0 })
        {
            return ApiResponse<RecipeCollectionDto>.Fail("Tên bộ sưu tập không được để trống.");
        }

        if (name is not null) collection.Name = name;
        if (dto.Description is not null) collection.Description = dto.Description;
        if (dto.CoverImageUrl is not null) collection.CoverImageUrl = dto.CoverImageUrl;
        if (dto.IsPublic.HasValue) collection.IsPublic = dto.IsPublic.Value;
        await _db.SaveChangesAsync();

        return await GetCollectionAsync(userId, collectionId);
    }

    public async Task<ApiResponse<bool>> DeleteCollectionAsync(Guid userId, Guid collectionId)
    {
        var (collection, error) = await FindOwnedCollectionAsync<bool>(userId, collectionId);
        if (collection is null) return error!;

        _db.RecipeCollections.Remove(collection);
        await _db.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true, "Đã xóa bộ sưu tập.");
    }

    public async Task<ApiResponse<bool>> AddRecipeToCollectionAsync(Guid userId, Guid collectionId, Guid recipeId)
    {
        var (collection, error) = await FindOwnedCollectionAsync<bool>(userId, collectionId);
        if (collection is null) return error!;

        var recipe = await _db.Recipes.FirstOrDefaultAsync(r => r.Id == recipeId);
        if (recipe == null) return ApiResponse<bool>.Fail("Không tìm thấy công thức món ăn.", null, ApiErrorKind.NotFound);

        var exists = await _db.CollectionRecipes.AnyAsync(cr => cr.CollectionId == collectionId && cr.RecipeId == recipeId);
        if (exists) return ApiResponse<bool>.Ok(true, "Món ăn đã có trong bộ sưu tập.");

        await _db.CollectionRecipes.AddAsync(new CollectionRecipe { CollectionId = collectionId, RecipeId = recipeId });
        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Đã thêm món ăn vào bộ sưu tập.");
    }

    public async Task<ApiResponse<bool>> RemoveRecipeFromCollectionAsync(Guid userId, Guid collectionId, Guid recipeId)
    {
        var (collection, error) = await FindOwnedCollectionAsync<bool>(userId, collectionId);
        if (collection is null) return error!;

        var item = await _db.CollectionRecipes.FirstOrDefaultAsync(cr => cr.CollectionId == collectionId && cr.RecipeId == recipeId);
        if (item is null)
        {
            return ApiResponse<bool>.Fail("Món ăn không có trong bộ sưu tập.", null, ApiErrorKind.NotFound);
        }

        _db.CollectionRecipes.Remove(item);
        await _db.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true, "Đã bỏ món ăn khỏi bộ sưu tập.");
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    private IQueryable<RecipeCollection> CollectionsWithRecipes() => _db.RecipeCollections
        .AsNoTracking()
        .Include(c => c.CollectionRecipes).ThenInclude(cr => cr.Recipe).ThenInclude(r => r.RecipeTags).ThenInclude(rt => rt.Tag)
        .Include(c => c.CollectionRecipes).ThenInclude(cr => cr.Recipe).ThenInclude(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient).ThenInclude(i => i.IngredientAllergies)
        .AsSplitQuery();

    /// <summary>
    /// Bộ sưu tập chỉ chủ sở hữu mới được sửa (BR-152): không thấy → 404 (không lộ bộ sưu tập riêng tư của người khác),
    /// thấy được (công khai) nhưng không phải chủ → 403.
    /// </summary>
    private async Task<(RecipeCollection? Collection, ApiResponse<T>? Error)> FindOwnedCollectionAsync<T>(Guid userId, Guid collectionId)
    {
        var collection = await _db.RecipeCollections.FirstOrDefaultAsync(c => c.Id == collectionId);
        if (collection is null || (collection.UserId != userId && !collection.IsPublic))
        {
            return (null, ApiResponse<T>.Fail("Không tìm thấy bộ sưu tập.", null, ApiErrorKind.NotFound));
        }

        if (collection.UserId != userId)
        {
            return (null, ApiResponse<T>.Fail("Chỉ chủ sở hữu mới được sửa bộ sưu tập này.", null, ApiErrorKind.Forbidden));
        }

        return (collection, null);
    }

    private async Task<HashSet<int>> GetUserAllergyIdsAsync(Guid userId) =>
        (await _db.UserAllergies
            .Where(ua => ua.HealthProfile.UserId == userId)
            .Select(ua => ua.AllergyId)
            .ToListAsync()).ToHashSet();

    private async Task<HashSet<Guid>?> GetFavoriteIdsAsync(Guid? userId)
    {
        if (userId is not { } id) return null;
        return (await _db.UserFavorites.Where(f => f.UserId == id).Select(f => f.RecipeId).ToListAsync()).ToHashSet();
    }

    private static bool ContainsAnyAllergen(Recipe recipe, HashSet<int> allergyIds) =>
        recipe.RecipeIngredients.Any(ri => ri.Ingredient.IngredientAllergies.Any(a => allergyIds.Contains(a.AllergyId)));

    private static RecipeDto ToDto(Recipe r, HashSet<Guid>? favoriteIds)
    {
        var ingredients = r.RecipeIngredients.Select(ri => new RecipeIngredientDto
        {
            IngredientId = ri.IngredientId,
            Name = ri.Ingredient.Name,
            Amount = ri.Amount,
            Unit = ri.Unit,
            EstimatedPriceVnd = ri.Ingredient.EstimatedPriceVnd,
            AllergyIds = ri.Ingredient.IngredientAllergies.Select(a => a.AllergyId).Distinct().OrderBy(x => x).ToList()
        }).ToList();

        return new RecipeDto
        {
            Id = r.Id,
            Title = r.Title,
            Description = r.Description,
            ImageUrl = r.ImageUrl,
            Instructions = r.Instructions,
            PrepTimeMinutes = r.PrepTimeMinutes,
            CookTimeMinutes = r.CookTimeMinutes,
            TotalTimeMinutes = r.PrepTimeMinutes + r.CookTimeMinutes,
            Servings = r.Servings,
            Difficulty = r.Difficulty,
            IsPremium = r.IsPremium,
            CaloriesPerServing = r.CaloriesPerServing,
            CarbsPerServing = r.CarbsPerServing,
            FatPerServing = r.FatPerServing,
            ProteinPerServing = r.ProteinPerServing,
            Tags = r.RecipeTags.Select(rt => rt.Tag.Name).ToList(),
            MealTypes = r.MealTypes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
            AllergyIds = ingredients.SelectMany(i => i.AllergyIds).Distinct().OrderBy(x => x).ToList(),
            IsFavorite = favoriteIds?.Contains(r.Id) ?? false,
            Ingredients = ingredients
        };
    }

    private static RecipeCollectionDto ToCollectionDto(RecipeCollection c, Guid userId, HashSet<Guid>? favorites) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Description = c.Description,
        CoverImageUrl = c.CoverImageUrl ?? c.CollectionRecipes.FirstOrDefault()?.Recipe.ImageUrl,
        RecipeCount = c.CollectionRecipes.Count,
        IsPublic = c.IsPublic,
        OwnerId = c.UserId,
        IsOwner = c.UserId == userId,
        Recipes = c.CollectionRecipes.Select(cr => ToDto(cr.Recipe, favorites)).ToList()
    };
}
