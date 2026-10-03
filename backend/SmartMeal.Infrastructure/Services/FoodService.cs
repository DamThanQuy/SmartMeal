using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Foods;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class FoodService : IFoodService
{
    private const int MaxCustomFoodsPerUser = 200;
    private const int MaxRecentFoods = 50;

    private readonly ApplicationDbContext _db;

    public FoodService(ApplicationDbContext db)
    {
        _db = db;
    }

    // ───────────────────────────── Đọc ─────────────────────────────

    public async Task<ApiResponse<PagedResult<FoodItemDto>>> GetFoodsAsync(FoodQuery query, Guid? userId)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize is < 1 or > 100 ? 20 : query.PageSize;

        var scope = (query.Scope ?? "all").Trim().ToLowerInvariant();
        if (scope is not ("all" or "mine" or "recent" or "favorite"))
        {
            return ApiResponse<PagedResult<FoodItemDto>>.Fail("scope phải là một trong: all, mine, recent, favorite.");
        }

        if (scope != "all" && userId is null)
        {
            return ApiResponse<PagedResult<FoodItemDto>>.Fail("Cần đăng nhập để xem mục này.", null, ApiErrorKind.Unauthorized);
        }

        var foods = Visible(userId);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var needle = TextNormalizer.Fold(query.Search);
            foods = foods.Where(f => f.SearchText.Contains(needle));
        }

        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            var category = query.Category.Trim().ToLower();
            foods = foods.Where(f => f.Category.ToLower() == category);
        }

        List<Guid>? recentOrder = null;
        switch (scope)
        {
            case "mine":
                foods = foods.Where(f => f.OwnerUserId == userId);
                break;
            case "favorite":
                foods = foods.Where(f => _db.UserFavoriteFoods.Any(x => x.UserId == userId && x.IngredientId == f.Id));
                break;
            case "recent":
                recentOrder = await RecentFoodIdsAsync(userId!.Value);
                foods = foods.Where(f => recentOrder.Contains(f.Id));
                break;
        }

        var totalCount = await foods.CountAsync();

        List<Ingredient> entities;
        if (recentOrder is not null)
        {
            // "Gần đây": món vừa ghi gần nhất đứng đầu.
            var all = await WithDetails(foods).ToListAsync();
            entities = all.OrderBy(f => recentOrder.IndexOf(f.Id)).Skip((page - 1) * pageSize).Take(pageSize).ToList();
        }
        else
        {
            entities = await WithDetails(foods.OrderBy(f => f.Name).ThenBy(f => f.Id))
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        var favorites = await FavoriteIdsAsync(userId);
        return ApiResponse<PagedResult<FoodItemDto>>.Ok(new PagedResult<FoodItemDto>
        {
            Items = entities.Select(f => ToDto(f, favorites)).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        });
    }

    public async Task<ApiResponse<FoodItemDto>> GetFoodByIdAsync(Guid id, Guid? userId)
    {
        var food = await WithDetails(Visible(userId)).FirstOrDefaultAsync(f => f.Id == id);
        if (food == null)
            return ApiResponse<FoodItemDto>.Fail("Không tìm thấy thực phẩm.", null, ApiErrorKind.NotFound);

        return ApiResponse<FoodItemDto>.Ok(ToDto(food, await FavoriteIdsAsync(userId)));
    }

    public async Task<ApiResponse<FoodItemDto>> GetFoodByBarcodeAsync(string barcode, Guid? userId)
    {
        var code = new string((barcode ?? string.Empty).Where(char.IsDigit).ToArray());
        if (code.Length is < 8 or > 14 || code.Length != (barcode ?? string.Empty).Trim().Length)
        {
            return ApiResponse<FoodItemDto>.Fail("Mã vạch phải gồm 8 đến 14 chữ số.");
        }

        // Món của chính người dùng ưu tiên hơn thực phẩm chung.
        var matches = await WithDetails(Visible(userId)).Where(f => f.Barcode == code).ToListAsync();
        var food = matches.FirstOrDefault(f => f.OwnerUserId != null) ?? matches.FirstOrDefault();
        if (food == null)
            return ApiResponse<FoodItemDto>.Fail("Chưa có sản phẩm với mã vạch này.", null, ApiErrorKind.NotFound);

        return ApiResponse<FoodItemDto>.Ok(ToDto(food, await FavoriteIdsAsync(userId)));
    }

    // ───────────────────────────── Ghi ─────────────────────────────

    public async Task<ApiResponse<FoodItemDto>> CreateFoodAsync(Guid userId, CreateFoodRequestDto dto)
    {
        var name = (dto.Name ?? string.Empty).Trim();
        if (name.Length == 0)
        {
            return ApiResponse<FoodItemDto>.Fail("Tên món không được để trống.");
        }

        // Trên 100 g thực phẩm không thể có hơn 100 g chất dinh dưỡng đa lượng — chặn số liệu vô lý nhưng không tự sửa số liệu.
        if (dto.CarbsPer100g + dto.FatPer100g + dto.ProteinPer100g > 100.5)
        {
            return ApiResponse<FoodItemDto>.Fail("Tổng tinh bột, chất béo và chất đạm trên 100 g không thể vượt quá 100 g.");
        }

        var allergyIds = (dto.AllergyIds ?? new List<int>()).Distinct().ToList();
        if (allergyIds.Count > 0)
        {
            var known = await _db.Allergies.CountAsync(a => allergyIds.Contains(a.Id));
            if (known != allergyIds.Count)
            {
                return ApiResponse<FoodItemDto>.Fail("Danh sách chất gây dị ứng có mã không hợp lệ.");
            }
        }

        var searchText = BuildSearchText(name, dto.Description);
        if (await _db.Ingredients.AnyAsync(i => i.OwnerUserId == userId && i.SearchText == searchText))
        {
            return ApiResponse<FoodItemDto>.Fail("Bạn đã có một món cùng tên.", null, ApiErrorKind.Conflict);
        }

        if (await _db.Ingredients.CountAsync(i => i.OwnerUserId == userId) >= MaxCustomFoodsPerUser)
        {
            return ApiResponse<FoodItemDto>.Fail($"Mỗi tài khoản chỉ có thể tự nhập tối đa {MaxCustomFoodsPerUser} món.");
        }

        var food = new Ingredient
        {
            Name = name,
            Description = dto.Description?.Trim(),
            ImageUrl = dto.ImageUrl?.Trim(),
            Category = string.IsNullOrWhiteSpace(dto.Category) ? "General" : dto.Category.Trim(),
            DefaultUnit = "g",
            CaloriesPer100g = dto.CaloriesPer100g,
            CarbsPer100g = dto.CarbsPer100g,
            FatPer100g = dto.FatPer100g,
            ProteinPer100g = dto.ProteinPer100g,
            FiberPer100g = dto.FiberPer100g,
            SugarPer100g = dto.SugarPer100g,
            SodiumMgPer100g = dto.SodiumMgPer100g,
            OwnerUserId = userId,
            IsVerified = false,
            Barcode = string.IsNullOrWhiteSpace(dto.Barcode) ? null : dto.Barcode.Trim(),
            SearchText = searchText
        };

        foreach (var allergyId in allergyIds)
        {
            food.IngredientAllergies.Add(new IngredientAllergy { IngredientId = food.Id, AllergyId = allergyId });
        }

        var servings = (dto.Servings is { Count: > 0 } ? dto.Servings : new List<CreateFoodServingDto> { new() { Label = "100 g", Grams = 100 } }).ToList();
        var defaultIndex = Math.Max(0, servings.FindIndex(s => s.IsDefault));
        for (var i = 0; i < servings.Count; i++)
        {
            food.Servings.Add(new FoodServing
            {
                IngredientId = food.Id,
                Label = servings[i].Label.Trim(),
                Grams = servings[i].Grams,
                IsDefault = i == defaultIndex
            });
        }

        _db.Ingredients.Add(food);
        await _db.SaveChangesAsync();

        var created = await WithDetails(_db.Ingredients).FirstAsync(f => f.Id == food.Id);
        return ApiResponse<FoodItemDto>.Ok(ToDto(created, await FavoriteIdsAsync(userId)), $"Đã lưu món '{food.Name}' (do bạn nhập).");
    }

    public async Task<ApiResponse<bool>> DeleteFoodAsync(Guid userId, Guid id)
    {
        var food = await _db.Ingredients.FirstOrDefaultAsync(f => f.Id == id && (f.OwnerUserId == null || f.OwnerUserId == userId));
        if (food == null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy thực phẩm.", null, ApiErrorKind.NotFound);
        }

        if (food.OwnerUserId != userId)
        {
            return ApiResponse<bool>.Fail("Chỉ xóa được món do chính bạn nhập.", null, ApiErrorKind.Forbidden);
        }

        // Nhật ký đã ghi giữ nguyên số liệu; chỉ gỡ liên kết tới món sắp xóa.
        await using var transaction = await _db.Database.BeginTransactionAsync();
        await _db.DiaryItems.Where(i => i.IngredientId == id).ExecuteUpdateAsync(s => s.SetProperty(i => i.IngredientId, (Guid?)null));
        await _db.Ingredients.Where(i => i.Id == id).ExecuteDeleteAsync();
        await transaction.CommitAsync();

        return ApiResponse<bool>.Ok(true, "Đã xóa món.");
    }

    public async Task<ApiResponse<FoodFavoriteDto>> SetFavoriteAsync(Guid userId, Guid id, bool isFavorite)
    {
        if (!await Visible(userId).AnyAsync(f => f.Id == id))
        {
            return ApiResponse<FoodFavoriteDto>.Fail("Không tìm thấy thực phẩm.", null, ApiErrorKind.NotFound);
        }

        if (isFavorite)
        {
            if (!await _db.UserFavoriteFoods.AnyAsync(f => f.UserId == userId && f.IngredientId == id))
            {
                _db.UserFavoriteFoods.Add(new UserFavoriteFood { UserId = userId, IngredientId = id });
                try
                {
                    await _db.SaveChangesAsync();
                }
                catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: Npgsql.PostgresErrorCodes.UniqueViolation })
                {
                    // Hai lần bấm đồng thời: bản kia đã lưu, kết quả vẫn là "đã yêu thích".
                    _db.ChangeTracker.Clear();
                }
            }
        }
        else
        {
            await _db.UserFavoriteFoods.Where(f => f.UserId == userId && f.IngredientId == id).ExecuteDeleteAsync();
        }

        return ApiResponse<FoodFavoriteDto>.Ok(
            new FoodFavoriteDto { IsFavorite = isFavorite },
            isFavorite ? "Đã thêm vào yêu thích." : "Đã bỏ khỏi yêu thích.");
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    /// <summary>Thực phẩm chung và món do chính người dùng nhập (không bao giờ thấy món riêng của người khác).</summary>
    private IQueryable<Ingredient> Visible(Guid? userId) =>
        _db.Ingredients.AsNoTracking().Where(f => f.OwnerUserId == null || f.OwnerUserId == userId);

    private static IQueryable<Ingredient> WithDetails(IQueryable<Ingredient> foods) => foods
        .Include(f => f.Allergy)
        .Include(f => f.IngredientAllergies)
        .Include(f => f.Servings)
        .AsSplitQuery();

    private async Task<List<Guid>> RecentFoodIdsAsync(Guid userId) =>
        await _db.DiaryItems
            .Where(i => i.NutritionDiary.UserId == userId && i.IngredientId != null)
            .GroupBy(i => i.IngredientId!.Value)
            .Select(g => new { Id = g.Key, Last = g.Max(i => i.CreatedAt) })
            .OrderByDescending(x => x.Last)
            .Take(MaxRecentFoods)
            .Select(x => x.Id)
            .ToListAsync();

    private async Task<HashSet<Guid>?> FavoriteIdsAsync(Guid? userId)
    {
        if (userId is not { } id) return null;
        return (await _db.UserFavoriteFoods.Where(f => f.UserId == id).Select(f => f.IngredientId).ToListAsync()).ToHashSet();
    }

    public static string BuildSearchText(string name, string? description) =>
        TextNormalizer.Fold($"{name} {description}").Trim();

    private static FoodItemDto ToDto(Ingredient i, HashSet<Guid>? favoriteIds)
    {
        var servings = i.Servings.OrderByDescending(s => s.IsDefault).ThenBy(s => s.Grams).ThenBy(s => s.Label).ToList();
        return new FoodItemDto
        {
            Id = i.Id,
            Name = i.Name,
            Description = i.Description,
            ImageUrl = i.ImageUrl,
            Category = i.Category,
            DefaultUnit = i.DefaultUnit,
            EstimatedPriceVnd = i.EstimatedPriceVnd,
            CaloriesPer100g = i.CaloriesPer100g,
            CarbsPer100g = i.CarbsPer100g,
            FatPer100g = i.FatPer100g,
            ProteinPer100g = i.ProteinPer100g,
            FiberPer100g = i.FiberPer100g,
            SugarPer100g = i.SugarPer100g,
            SodiumMgPer100g = i.SodiumMgPer100g,
            AllergyId = i.AllergyId,
            AllergyName = i.Allergy?.Name,
            AllergyIds = i.IngredientAllergies.Select(a => a.AllergyId).Distinct().OrderBy(x => x).ToList(),
            IsVerified = i.IsVerified,
            IsUserCreated = i.OwnerUserId != null,
            IsFavorite = favoriteIds?.Contains(i.Id) ?? false,
            Barcode = i.Barcode,
            Servings = servings.Select(s => new FoodServingDto { Id = s.Id, Label = s.Label, Grams = s.Grams }).ToList(),
            DefaultServingId = servings.FirstOrDefault(s => s.IsDefault)?.Id ?? servings.FirstOrDefault()?.Id
        };
    }
}
