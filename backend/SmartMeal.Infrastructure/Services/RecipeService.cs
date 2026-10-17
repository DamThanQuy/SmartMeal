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

/// <summary>
/// Dịch vụ quản lý công thức món ăn, gợi ý món ăn theo nguyên liệu trong tủ lạnh (Pantry Suggestion),
/// quản lý danh sách yêu thích và bộ sưu tập công thức cá nhân/công khai của người dùng.
/// Tự động tích hợp cảnh báo sức khỏe và dị ứng cá nhân hóa theo hồ sơ sức khỏe người xem (BR-101/102/110/111).
/// </summary>
public class RecipeService : IRecipeService
{
    private const int MaxPageSize = 50;
    private const int DefaultPageSize = 10;

    private readonly ApplicationDbContext _db;
    private readonly HealthConditionLimitsOptions _limits;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="RecipeService"/>.
    /// </summary>
    /// <param name="db">DbContext kết nối cơ sở dữ liệu ứng dụng.</param>
    /// <param name="limits">Tùy chọn ngưỡng giới hạn dinh dưỡng cho các tình trạng bệnh lý (cao huyết áp, tiểu đường, gout, bệnh thận,...).</param>
    public RecipeService(ApplicationDbContext db, IOptions<HealthConditionLimitsOptions> limits)
    {
        _db = db;
        _limits = limits.Value;
    }

    /// <summary>
    /// Thông tin về người đang xem để cá nhân hóa công thức: món yêu thích, bệnh lý (cảnh báo BR-110/111) và "dị ứng khác"
    /// tự nhập (cảnh báo BR-101/102).
    /// </summary>
    private sealed record Viewer(HashSet<Guid>? FavoriteIds, IReadOnlyCollection<string> ConditionCodes, IReadOnlyList<string> OtherAllergens)
    {
        public static readonly Viewer Anonymous = new(null, Array.Empty<string>(), Array.Empty<string>());
    }

    /// <summary>Công thức kèm tag, nguyên liệu và chất gây dị ứng của từng nguyên liệu.</summary>
    private IQueryable<Recipe> RecipesWithDetails() => _db.Recipes
        .AsNoTracking()
        .Include(r => r.RecipeTags).ThenInclude(rt => rt.Tag)
        .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient).ThenInclude(i => i.IngredientAllergies)
        .AsSplitQuery();

    // ───────────────────────────── Danh sách / chi tiết ─────────────────────────────

    /// <summary>
    /// Lấy danh sách công thức món ăn kèm phân trang và bộ lọc linh hoạt (từ khóa không dấu, tag, độ khó, calo tối đa, thời gian nấu, loại bữa ăn, loại trừ dị ứng).
    /// Cá nhân hóa kết quả với trạng thái yêu thích và cảnh báo dị ứng/bệnh lý nếu có người dùng đăng nhập.
    /// </summary>
    /// <param name="query">Đối tượng chứa các tiêu chí tìm kiếm và tham số phân trang.</param>
    /// <param name="userId">Định danh người dùng đang xem (tùy chọn, dùng để cá nhân hóa kết quả).</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa kết quả phân trang các công thức món ăn.</returns>
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

            // "Dị ứng khác" là từ khóa tự do nên không dịch được sang SQL: tìm id công thức trùng khớp trong bộ nhớ rồi loại.
            var otherAllergens = await GetOtherAllergensAsync(allergyOwner);
            if (otherAllergens.Count > 0)
            {
                var names = await _db.Recipes.AsNoTracking()
                    .Select(r => new { r.Id, r.Title, Ingredients = r.RecipeIngredients.Select(ri => ri.Ingredient.Name).ToList() })
                    .ToListAsync();
                var excluded = names
                    .Where(r => CustomAllergens.FindMatch(otherAllergens, r.Ingredients.Prepend(r.Title)) is not null)
                    .Select(r => r.Id)
                    .ToList();
                if (excluded.Count > 0)
                {
                    recipes = recipes.Where(r => !excluded.Contains(r.Id));
                }
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

    /// <summary>
    /// Lấy thông tin chi tiết của một công thức món ăn theo mã định danh, bao gồm danh sách nguyên liệu, cách nấu, tag và cảnh báo sức khỏe.
    /// </summary>
    /// <param name="id">Mã định danh công thức món ăn.</param>
    /// <param name="userId">Định danh người dùng đang xem (tùy chọn).</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa thông tin chi tiết công thức.</returns>
    public async Task<ApiResponse<RecipeDto>> GetRecipeByIdAsync(Guid id, Guid? userId)
    {
        var r = await RecipesWithDetails().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return ApiResponse<RecipeDto>.Fail("Không tìm thấy công thức món ăn.", null, ApiErrorKind.NotFound);

        return ApiResponse<RecipeDto>.Ok(ToDto(r, await GetViewerAsync(userId)));
    }

    /// <summary>
    /// Đề xuất danh sách công thức nấu ăn dựa trên các nguyên liệu có sẵn trong tủ lạnh (Pantry Suggestion).
    /// Tự động loại bỏ hoàn toàn các món ăn chứa thành phần gây dị ứng của người dùng (BR-102),
    /// và xếp hạng ưu tiên các món có số lượng nguyên liệu khớp nhiều nhất.
    /// </summary>
    /// <param name="dto">Danh sách tên các nguyên liệu hiện có trong tủ lạnh.</param>
    /// <param name="userId">Định danh người dùng thực hiện gợi ý (tùy chọn).</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa danh sách tối đa 10 công thức phù hợp nhất.</returns>
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

        var otherAllergens = userId is { } owner ? await GetOtherAllergensAsync(owner) : Array.Empty<string>();
        if (otherAllergens.Count > 0)
        {
            recipes = recipes.Where(r => MatchOtherAllergen(r, otherAllergens) is null).ToList();
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
            : userAllergies.Count > 0 || otherAllergens.Count > 0
                ? "Không có món nào phù hợp với nguyên liệu này mà không chứa chất gây dị ứng của bạn."
                : "Chưa có món nào dùng các nguyên liệu này.";
        return ApiResponse<List<RecipeDto>>.Ok(ranked.Select(r => ToDto(r, favorites)).ToList(), message);
    }

    // ───────────────────────────── Yêu thích ─────────────────────────────

    /// <summary>
    /// Thêm hoặc bỏ một món ăn khỏi danh sách yêu thích cá nhân của người dùng (Toggle Favorite).
    /// </summary>
    /// <param name="userId">Định danh người dùng thao tác.</param>
    /// <param name="recipeId">Định danh công thức món ăn cần bật/tắt yêu thích.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa trạng thái yêu thích mới và tổng số món yêu thích hiện có.</returns>
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

    /// <summary>
    /// Lấy danh sách toàn bộ các món ăn đã được người dùng lưu vào danh sách yêu thích cá nhân.
    /// </summary>
    /// <param name="userId">Định danh người dùng.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa danh sách công thức món ăn yêu thích.</returns>
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

    /// <summary>
    /// Lấy danh sách các bộ sưu tập công thức thuộc quyền sở hữu của người dùng hoặc các bộ sưu tập được công khai (Public).
    /// </summary>
    /// <param name="userId">Định danh người dùng.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa danh sách các bộ sưu tập.</returns>
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

    /// <summary>
    /// Lấy chi tiết một bộ sưu tập công thức theo mã định danh (nếu người dùng là chủ sở hữu hoặc bộ sưu tập là công khai).
    /// </summary>
    /// <param name="userId">Định danh người dùng đang xem.</param>
    /// <param name="collectionId">Mã định danh bộ sưu tập.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa thông tin chi tiết bộ sưu tập kèm danh sách công thức.</returns>
    public async Task<ApiResponse<RecipeCollectionDto>> GetCollectionAsync(Guid userId, Guid collectionId)
    {
        var collection = await CollectionsWithRecipes().FirstOrDefaultAsync(c => c.Id == collectionId && (c.UserId == userId || c.IsPublic));
        if (collection is null)
        {
            return ApiResponse<RecipeCollectionDto>.Fail("Không tìm thấy bộ sưu tập.", null, ApiErrorKind.NotFound);
        }

        return ApiResponse<RecipeCollectionDto>.Ok(ToCollectionDto(collection, userId, await GetViewerAsync(userId)));
    }

    /// <summary>
    /// Tạo một bộ sưu tập công thức mới cho người dùng.
    /// </summary>
    /// <param name="userId">Định danh người dùng tạo bộ sưu tập.</param>
    /// <param name="dto">Dữ liệu tạo bộ sưu tập gồm tên, mô tả, ảnh đại diện và chế độ hiển thị công khai/riêng tư.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa thông tin bộ sưu tập vừa tạo.</returns>
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

    /// <summary>
    /// Cập nhật thông tin bộ sưu tập công thức (tên, mô tả, ảnh đại diện, trạng thái công khai).
    /// Chỉ chủ sở hữu mới có quyền cập nhật (BR-152).
    /// </summary>
    /// <param name="userId">Định danh người dùng thao tác.</param>
    /// <param name="collectionId">Mã định danh bộ sưu tập cần sửa.</param>
    /// <param name="dto">Dữ liệu các trường cần cập nhật.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa thông tin bộ sưu tập sau cập nhật.</returns>
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

    /// <summary>
    /// Xóa một bộ sưu tập công thức. Chỉ chủ sở hữu mới có quyền xóa.
    /// </summary>
    /// <param name="userId">Định danh người dùng thao tác.</param>
    /// <param name="collectionId">Mã định danh bộ sưu tập cần xóa.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> xác nhận kết quả xóa thành công.</returns>
    public async Task<ApiResponse<bool>> DeleteCollectionAsync(Guid userId, Guid collectionId)
    {
        var (collection, error) = await FindOwnedCollectionAsync<bool>(userId, collectionId);
        if (collection is null) return error!;

        _db.RecipeCollections.Remove(collection);
        await _db.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true, "Đã xóa bộ sưu tập.");
    }

    /// <summary>
    /// Thêm một công thức món ăn vào bộ sưu tập của người dùng.
    /// </summary>
    /// <param name="userId">Định danh người dùng sở hữu bộ sưu tập.</param>
    /// <param name="collectionId">Mã định danh bộ sưu tập.</param>
    /// <param name="recipeId">Mã định danh công thức món ăn cần thêm.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> xác nhận thêm thành công.</returns>
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

    /// <summary>
    /// Bỏ một công thức món ăn khỏi bộ sưu tập của người dùng.
    /// </summary>
    /// <param name="userId">Định danh người dùng sở hữu bộ sưu tập.</param>
    /// <param name="collectionId">Mã định danh bộ sưu tập.</param>
    /// <param name="recipeId">Mã định danh công thức món ăn cần bỏ.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> xác nhận bỏ món ăn thành công.</returns>
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
    /// Bật liên kết chia sẻ cho bộ sưu tập (chỉ chủ sở hữu).
    /// Nếu đã có token chia sẻ và không yêu cầu tạo lại, hàm trả về token hiện tại;
    /// nếu <paramref name="regenerate"/> = true thì hủy token cũ và sinh token ngẫu nhiên mới bảo mật cao.
    /// </summary>
    /// <param name="userId">Định danh người dùng chủ sở hữu.</param>
    /// <param name="collectionId">Mã định danh bộ sưu tập cần chia sẻ.</param>
    /// <param name="regenerate">True nếu muốn làm mới token chia sẻ và vô hiệu hóa link cũ.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa mã token chia sẻ và thời điểm chia sẻ.</returns>
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

    /// <summary>
    /// Thu hồi liên kết chia sẻ của bộ sưu tập (idempotent).
    /// Sau khi thu hồi, bất kỳ ai truy cập bằng liên kết cũ sẽ nhận mã lỗi 404.
    /// </summary>
    /// <param name="userId">Định danh chủ sở hữu bộ sưu tập.</param>
    /// <param name="collectionId">Mã định danh bộ sưu tập.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> xác nhận đã tắt liên kết chia sẻ.</returns>
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

    /// <summary>
    /// Xem chi tiết một bộ sưu tập qua liên kết chia sẻ công khai mà không cần đăng nhập hoặc quyền sở hữu (chế độ chỉ đọc).
    /// </summary>
    /// <param name="shareToken">Mã token chia sẻ ngẫu nhiên đính kèm trên URL.</param>
    /// <param name="userId">Định danh người dùng đang xem (tùy chọn, dùng để cá nhân hóa món yêu thích).</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa thông tin bộ sưu tập và danh sách công thức.</returns>
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

    /// <summary>Sinh 24 byte ngẫu nhiên mã hóa base64url (32 ký tự) dùng làm token chia sẻ an toàn không thể đoán.</summary>
    private static string NewShareToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(24)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    // ───────────────────────────── Nội bộ ─────────────────────────────

    /// <summary>Truy vấn danh sách bộ sưu tập nạp kèm công thức, tag, nguyên liệu và danh mục chất dị ứng.</summary>
    private IQueryable<RecipeCollection> CollectionsWithRecipes() => _db.RecipeCollections
        .AsNoTracking()
        .Include(c => c.CollectionRecipes).ThenInclude(cr => cr.Recipe).ThenInclude(r => r.RecipeTags).ThenInclude(rt => rt.Tag)
        .Include(c => c.CollectionRecipes).ThenInclude(cr => cr.Recipe).ThenInclude(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient).ThenInclude(i => i.IngredientAllergies)
        .AsSplitQuery();

    /// <summary>
    /// Tìm bộ sưu tập và kiểm tra quyền sở hữu của người dùng (BR-152).
    /// Nếu không tìm thấy hoặc là riêng tư của người khác: trả về 404; nếu là công khai của người khác: trả về 403 Forbidden.
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

    /// <summary>Lấy danh sách mã định danh chất dị ứng chuẩn của người dùng từ hồ sơ sức khỏe.</summary>
    private async Task<HashSet<int>> GetUserAllergyIdsAsync(Guid userId) =>
        (await _db.UserAllergies
            .Where(ua => ua.HealthProfile.UserId == userId)
            .Select(ua => ua.AllergyId)
            .ToListAsync()).ToHashSet();

    /// <summary>Nạp thông tin người xem (món yêu thích, bệnh lý, dị ứng tự do) để phục vụ cá nhân hóa.</summary>
    private async Task<Viewer> GetViewerAsync(Guid? userId)
    {
        if (userId is not { } id) return Viewer.Anonymous;
        var favorites = (await _db.UserFavorites.Where(f => f.UserId == id).Select(f => f.RecipeId).ToListAsync()).ToHashSet();
        var conditions = await _db.UserConditions.AsNoTracking()
            .Where(uc => uc.HealthProfile.UserId == id)
            .Select(uc => uc.MedicalCondition.Code)
            .ToListAsync();
        return new Viewer(favorites, conditions, await GetOtherAllergensAsync(id));
    }

    /// <summary>Lấy danh sách từ khóa dị ứng tự do (OtherAllergies) của người dùng.</summary>
    private async Task<IReadOnlyList<string>> GetOtherAllergensAsync(Guid userId) =>
        CustomAllergens.Keywords(await _db.HealthProfiles.AsNoTracking()
            .Where(hp => hp.UserId == userId)
            .Select(hp => hp.OtherAllergies)
            .FirstOrDefaultAsync());

    /// <summary>Kiểm tra xem công thức món ăn có chứa bất kỳ chất gây dị ứng nào trong danh sách chỉ định không.</summary>
    private static bool ContainsAnyAllergen(Recipe recipe, HashSet<int> allergyIds) =>
        recipe.RecipeIngredients.Any(ri => ri.Ingredient.IngredientAllergies.Any(a => allergyIds.Contains(a.AllergyId)));

    /// <summary>Kiểm tra xem công thức có chứa từ khóa dị ứng tự do nào không.</summary>
    private static string? MatchOtherAllergen(Recipe recipe, IReadOnlyList<string> otherAllergens) =>
        CustomAllergens.FindMatch(otherAllergens, recipe.RecipeIngredients.Select(ri => ri.Ingredient.Name).Prepend(recipe.Title));

    /// <summary>Tạo danh sách thông báo cảnh báo dị ứng tự do nếu có nguyên liệu trùng khớp.</summary>
    private static IEnumerable<string> OtherAllergenWarnings(Recipe recipe, Viewer viewer) =>
        MatchOtherAllergen(recipe, viewer.OtherAllergens) is { } keyword
            ? new[] { $"Có thể chứa \"{keyword}\" — nằm trong dị ứng khác bạn đã khai báo." }
            : Array.Empty<string>();

    /// <summary>
    /// Chuyển đổi thực thể <see cref="Recipe"/> sang DTO <see cref="RecipeDto"/> có kèm cá nhân hóa (yêu thích, cảnh báo sức khỏe).
    /// </summary>
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
            HealthWarnings = OtherAllergenWarnings(r, viewer)
                .Concat(HealthConditionRules.Evaluate(r, viewer.ConditionCodes, _limits).Select(v => v.Message))
                .ToList(),
            Ingredients = ingredients
        };
    }

    /// <summary>
    /// Chuyển đổi thực thể <see cref="RecipeCollection"/> sang DTO <see cref="RecipeCollectionDto"/>.
    /// </summary>
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
