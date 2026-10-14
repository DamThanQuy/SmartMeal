using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Recipes;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

public class RecipeService : IRecipeService
{
    private const int MaxPageSize = 50;
    private const int DefaultPageSize = 10;

    private readonly ApplicationDbContext _db;
    private readonly HealthConditionLimitsOptions _limits;

    public RecipeService(ApplicationDbContext db, IOptions<HealthConditionLimitsOptions> limits)
    {
        _db = db;
        _limits = limits.Value;
    }

    /// <summary>Thông tin về người đang xem để cá nhân hóa công thức: món yêu thích và bệnh lý (cho cảnh báo BR-110/111).</summary>
    private sealed record Viewer(HashSet<Guid>? FavoriteIds, IReadOnlyCollection<string> ConditionCodes)
    {
        public static readonly Viewer Anonymous = new(null, Array.Empty<string>());
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

        var favorites = await GetViewerAsync(userId);
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

        return ApiResponse<RecipeDto>.Ok(ToDto(r, await GetViewerAsync(userId)));
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

        var favorites = await GetViewerAsync(userId);
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

        var favorites = await GetViewerAsync(userId);
        return ApiResponse<List<RecipeDto>>.Ok(recipes.Select(r => ToDto(r, favorites)).ToList(), "Lấy danh sách món ăn yêu thích thành công.");
    }

    // ───────────────────────────── Bộ sưu tập ─────────────────────────────

    public async Task<ApiResponse<List<RecipeCollectionDto>>> GetCollectionsAsync(Guid userId)
    {
        var collections = await CollectionsWithRecipes()
            .Where(c => c.UserId == userId || c.IsPublic)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var favorites = await GetViewerAsync(userId);
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

        return ApiResponse<RecipeCollectionDto>.Ok(ToCollectionDto(collection, userId, await GetViewerAsync(userId)));
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

    // ───────────────────────────── Chia sẻ bộ sưu tập ─────────────────────────────

    /// <summary>
    /// Bật liên kết chia sẻ (chỉ chủ sở hữu). Đã có mã thì trả lại mã cũ; <paramref name="regenerate"/> = true thì tạo mã mới và
    /// liên kết cũ hết hiệu lực. Liên kết xem được cả khi bộ sưu tập để riêng tư.
    /// </summary>
    public async Task<ApiResponse<CollectionShareDto>> CreateShareLinkAsync(Guid userId, Guid collectionId, bool regenerate)
    {
        var (collection, error) = await FindOwnedCollectionAsync<CollectionShareDto>(userId, collectionId);
        if (error is not null) return error;

        if (collection!.ShareToken is null || regenerate)
        {
            collection.ShareToken = NewShareToken();
            collection.SharedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return ApiResponse<CollectionShareDto>.Ok(
            new CollectionShareDto { ShareToken = collection.ShareToken!, SharedAt = DateTime.SpecifyKind(collection.SharedAt ?? DateTime.UtcNow, DateTimeKind.Utc) },
            "Đã bật liên kết chia sẻ.");
    }

    /// <summary>Thu hồi liên kết chia sẻ (idempotent): mã cũ không còn mở được.</summary>
    public async Task<ApiResponse<bool>> RevokeShareLinkAsync(Guid userId, Guid collectionId)
    {
        var (collection, error) = await FindOwnedCollectionAsync<bool>(userId, collectionId);
        if (error is not null) return error;

        if (collection!.ShareToken is not null)
        {
            collection.ShareToken = null;
            collection.SharedAt = null;
            await _db.SaveChangesAsync();
        }

        return ApiResponse<bool>.Ok(true, "Đã tắt liên kết chia sẻ.");
    }

    /// <summary>Xem bộ sưu tập qua liên kết chia sẻ (chỉ đọc). Mã sai hoặc đã thu hồi → 404.</summary>
    public async Task<ApiResponse<RecipeCollectionDto>> GetSharedCollectionAsync(string shareToken, Guid? userId)
    {
        var token = shareToken?.Trim() ?? string.Empty;
        var collection = token.Length is > 0 and <= 64
            ? await CollectionsWithRecipes().FirstOrDefaultAsync(c => c.ShareToken == token)
            : null;
        if (collection is null)
        {
            return ApiResponse<RecipeCollectionDto>.Fail("Liên kết chia sẻ không tồn tại hoặc đã bị tắt.", null, ApiErrorKind.NotFound);
        }

        return ApiResponse<RecipeCollectionDto>.Ok(ToCollectionDto(collection, userId ?? Guid.Empty, await GetViewerAsync(userId)));
    }

    /// <summary>24 byte ngẫu nhiên, base64url (32 ký tự) — không đoán được.</summary>
    private static string NewShareToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(24)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

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

    private async Task<Viewer> GetViewerAsync(Guid? userId)
    {
        if (userId is not { } id) return Viewer.Anonymous;
        var favorites = (await _db.UserFavorites.Where(f => f.UserId == id).Select(f => f.RecipeId).ToListAsync()).ToHashSet();
        var conditions = await _db.UserConditions.AsNoTracking()
            .Where(uc => uc.HealthProfile.UserId == id)
            .Select(uc => uc.MedicalCondition.Code)
            .ToListAsync();
        return new Viewer(favorites, conditions);
    }

    private static bool ContainsAnyAllergen(Recipe recipe, HashSet<int> allergyIds) =>
        recipe.RecipeIngredients.Any(ri => ri.Ingredient.IngredientAllergies.Any(a => allergyIds.Contains(a.AllergyId)));

    private RecipeDto ToDto(Recipe r, Viewer viewer)
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
            Tags = r.RecipeTags.OrderBy(rt => rt.TagId).Select(rt => rt.Tag.Name).ToList(),
            TagCodes = r.RecipeTags.OrderBy(rt => rt.TagId).Select(rt => rt.Tag.Code).ToList(),
            MealTypes = r.MealTypes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
            AllergyIds = ingredients.SelectMany(i => i.AllergyIds).Distinct().OrderBy(x => x).ToList(),
            IsFavorite = viewer.FavoriteIds?.Contains(r.Id) ?? false,
            HealthWarnings = HealthConditionRules.Evaluate(r, viewer.ConditionCodes, _limits).Select(v => v.Message).ToList(),
            Ingredients = ingredients
        };
    }

    private RecipeCollectionDto ToCollectionDto(RecipeCollection c, Guid userId, Viewer favorites) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Description = c.Description,
        CoverImageUrl = c.CoverImageUrl ?? c.CollectionRecipes.FirstOrDefault()?.Recipe.ImageUrl,
        RecipeCount = c.CollectionRecipes.Count,
        IsPublic = c.IsPublic,
        OwnerId = c.UserId,
        IsOwner = c.UserId == userId,
        ShareToken = c.UserId == userId ? c.ShareToken : null,
        Recipes = c.CollectionRecipes.Select(cr => ToDto(cr.Recipe, favorites)).ToList()
    };
}
