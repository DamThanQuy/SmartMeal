using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Grocery;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class GroceryService : IGroceryService
{
    /// <summary>Khoảng ngày tối đa khi tạo danh sách từ thực đơn (chặn request quét cả năm).</summary>
    private const int MaxRangeDays = 31;

    private readonly ApplicationDbContext _db;
    private readonly ILogger<GroceryService> _logger;

    public GroceryService(ApplicationDbContext db, ILogger<GroceryService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<ApiResponse<GrocerySummaryDto>> GetGroceryListAsync(Guid userId)
    {
        var items = await _db.GroceryItems
            .AsNoTracking()
            .Include(g => g.Recipe)
            .Where(g => g.UserId == userId)
            .OrderBy(g => g.Category)
            .ThenBy(g => g.IngredientName)
            .ToListAsync();

        var summary = new GrocerySummaryDto
        {
            TotalItems = items.Count,
            CheckedItems = items.Count(i => i.IsChecked),
            TotalEstimatedCostVnd = items.Sum(i => i.EstimatedPriceVnd),
            Categories = items
                .GroupBy(i => i.Category)
                .Select(g => new GroceryCategoryDto { CategoryName = g.Key, Items = g.Select(ToDto).ToList() })
                .ToList()
        };

        return ApiResponse<GrocerySummaryDto>.Ok(summary, "Lấy danh sách đi chợ thành công.");
    }

    public async Task<ApiResponse<GrocerySummaryDto>> GenerateFromMealPlanAsync(Guid userId, GenerateGroceryRequestDto dto)
    {
        if (dto.StartDate == default || dto.EndDate == default)
        {
            return ApiResponse<GrocerySummaryDto>.Fail("Vui lòng chọn khoảng ngày để tạo danh sách đi chợ.");
        }

        if (dto.EndDate < dto.StartDate)
        {
            return ApiResponse<GrocerySummaryDto>.Fail("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        }

        if (dto.EndDate.DayNumber - dto.StartDate.DayNumber >= MaxRangeDays)
        {
            return ApiResponse<GrocerySummaryDto>.Fail($"Khoảng ngày tối đa là {MaxRangeDays} ngày.");
        }

        // 1. Thực đơn trong khoảng, kèm nguyên liệu
        var plans = await _db.MealPlans
            .AsNoTracking()
            .Include(mp => mp.Recipe).ThenInclude(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
            .AsSplitQuery()
            .Where(mp => mp.UserId == userId && mp.PlanDate >= dto.StartDate && mp.PlanDate <= dto.EndDate)
            .ToListAsync();

        if (!plans.Any())
        {
            return ApiResponse<GrocerySummaryDto>.Fail("Không tìm thấy thực đơn nào trong khoảng thời gian đã chọn để tạo danh sách đi chợ.");
        }

        // 2. Gộp nguyên liệu cùng tên + đơn vị (kg → g, l → ml); đếm số bữa đóng góp cho mỗi dòng.
        var aggregated = new Dictionary<string, Aggregate>();
        foreach (var plan in plans.OrderBy(p => p.PlanDate).ThenBy(p => p.MealType))
        {
            foreach (var ri in plan.Recipe.RecipeIngredients)
            {
                var (amount, unit) = NormalizeUnit(ri.Amount, ri.Unit);
                var key = KeyOf(ri.Ingredient.Name, unit);
                if (!aggregated.TryGetValue(key, out var line))
                {
                    aggregated[key] = line = new Aggregate(ri.Ingredient.Name, unit, MapIngredientCategory(ri.Ingredient.Category), plan.RecipeId);
                }

                line.Amount += amount;
                line.Price += EstimatePrice(ri.Ingredient.EstimatedPriceVnd, amount, unit);
                line.PlanIds.Add(plan.Id);
            }
        }

        // 3. Danh sách hiện có: mặc định thay phần đã tạo từ thực đơn (giữ món tự thêm); carry-over thì giữ hết và cộng dồn.
        var existing = await _db.GroceryItems.Where(g => g.UserId == userId).ToListAsync();
        var carryOver = new Dictionary<string, GroceryItem>();
        if (dto.ClearExisting)
        {
            _db.GroceryItems.RemoveRange(existing.Where(g => g.MergedFromRecipeCount > 0));
        }
        else
        {
            foreach (var item in existing.Where(g => g.MergedFromRecipeCount > 0 && !g.IsChecked))
            {
                carryOver.TryAdd(KeyOf(item.IngredientName, item.Unit), item);
            }
        }

        foreach (var (key, line) in aggregated)
        {
            if (carryOver.TryGetValue(key, out var current))
            {
                current.Amount = Math.Round(current.Amount + line.Amount, 1);
                current.EstimatedPriceVnd = Math.Round(current.EstimatedPriceVnd + line.Price, 0);
                current.MergedFromRecipeCount += line.PlanIds.Count;
                continue;
            }

            _db.GroceryItems.Add(new GroceryItem
            {
                UserId = userId,
                IngredientName = line.Name,
                Amount = Math.Round(line.Amount, 1),
                Unit = line.Unit,
                Category = line.Category,
                EstimatedPriceVnd = Math.Round(line.Price, 0),
                RecipeId = line.FirstRecipeId,
                MergedFromRecipeCount = line.PlanIds.Count
            });
        }

        await _db.SaveChangesAsync();
        return await GetGroceryListAsync(userId);
    }

    public async Task<ApiResponse<GroceryItemDto>> AddCustomItemAsync(Guid userId, AddCustomGroceryItemDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.IngredientName))
        {
            return ApiResponse<GroceryItemDto>.Fail("Tên nguyên liệu không được để trống.");
        }

        var item = new GroceryItem
        {
            UserId = userId,
            IngredientName = dto.IngredientName.Trim(),
            Amount = dto.Amount > 0 ? dto.Amount : 1.0,
            Unit = !string.IsNullOrWhiteSpace(dto.Unit) ? dto.Unit.Trim() : "phần",
            Category = !string.IsNullOrWhiteSpace(dto.Category) ? dto.Category.Trim() : "Khác",
            EstimatedPriceVnd = dto.EstimatedPriceVnd ?? 0,
            MergedFromRecipeCount = 0
        };

        _db.GroceryItems.Add(item);
        await _db.SaveChangesAsync();

        return ApiResponse<GroceryItemDto>.Ok(ToDto(item), $"Đã thêm '{item.IngredientName}' vào danh sách đi chợ.");
    }

    public async Task<ApiResponse<GroceryItemDto>> ToggleItemCheckedAsync(Guid userId, Guid itemId, bool isChecked)
    {
        var item = await _db.GroceryItems.Include(g => g.Recipe).FirstOrDefaultAsync(g => g.Id == itemId && g.UserId == userId);
        if (item == null)
        {
            return ApiResponse<GroceryItemDto>.Fail("Không tìm thấy món hàng trong danh sách đi chợ.", null, ApiErrorKind.NotFound);
        }

        item.IsChecked = isChecked;
        await _db.SaveChangesAsync();

        return ApiResponse<GroceryItemDto>.Ok(ToDto(item), item.IsChecked ? "Đã đánh dấu đã mua." : "Đã bỏ đánh dấu mua.");
    }

    public async Task<ApiResponse<GrocerySummaryDto>> SetAllCheckedAsync(Guid userId, bool isChecked)
    {
        await _db.GroceryItems
            .Where(g => g.UserId == userId && g.IsChecked != isChecked)
            .ExecuteUpdateAsync(s => s.SetProperty(g => g.IsChecked, isChecked));

        var summary = await GetGroceryListAsync(userId);
        summary.Message = isChecked ? "Đã đánh dấu mua tất cả." : "Đã bỏ đánh dấu tất cả.";
        return summary;
    }

    public async Task<ApiResponse<bool>> DeleteItemAsync(Guid userId, Guid itemId)
    {
        var item = await _db.GroceryItems.FirstOrDefaultAsync(g => g.Id == itemId && g.UserId == userId);
        if (item == null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy món hàng cần xóa.", null, ApiErrorKind.NotFound);
        }

        _db.GroceryItems.Remove(item);
        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Đã xóa nguyên liệu khỏi danh sách đi chợ.");
    }

    public async Task<ApiResponse<bool>> ClearCheckedItemsAsync(Guid userId)
    {
        await _db.GroceryItems.Where(g => g.UserId == userId && g.IsChecked).ExecuteDeleteAsync();
        return ApiResponse<bool>.Ok(true, "Đã dọn dẹp các món hàng đã mua.");
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    private sealed class Aggregate
    {
        public Aggregate(string name, string unit, string category, Guid firstRecipeId)
        {
            Name = name;
            Unit = unit;
            Category = category;
            FirstRecipeId = firstRecipeId;
        }

        public string Name { get; }
        public string Unit { get; }
        public string Category { get; }
        public Guid FirstRecipeId { get; }
        public double Amount { get; set; }
        public decimal Price { get; set; }
        public HashSet<Guid> PlanIds { get; } = new();
    }

    private static string KeyOf(string name, string unit) => $"{TextNormalizer.Fold(name)}|{unit.Trim().ToLowerInvariant()}";

    /// <summary>Quy đổi kg → g và l → ml để cùng một nguyên liệu ở hai đơn vị vẫn được gộp.</summary>
    private static (double Amount, string Unit) NormalizeUnit(double amount, string unit)
    {
        var trimmed = unit.Trim();
        return trimmed.ToLowerInvariant() switch
        {
            "kg" => (amount * 1000, "g"),
            "gram" or "gr" => (amount, "g"),
            "l" or "lít" or "lit" => (amount * 1000, "ml"),
            _ => (amount, trimmed)
        };
    }

    /// <summary>
    /// <c>Ingredient.EstimatedPriceVnd</c> là giá cho 100 g/ml với nguyên liệu tính theo khối lượng/thể tích, và giá cho
    /// một đơn vị (quả, củ, miếng...) với nguyên liệu đếm được. Không có giá thì trả 0 thay vì bịa một con số.
    /// </summary>
    private static decimal EstimatePrice(decimal unitPrice, double amount, string unit)
    {
        if (unitPrice <= 0 || amount <= 0)
        {
            return 0;
        }

        return unit.ToLowerInvariant() is "g" or "ml"
            ? unitPrice * (decimal)(amount / 100.0)
            : unitPrice * (decimal)amount;
    }

    private static GroceryItemDto ToDto(GroceryItem item) => new()
    {
        Id = item.Id,
        IngredientName = item.IngredientName,
        Amount = Math.Round(item.Amount, 1),
        Unit = item.Unit,
        Category = item.Category,
        EstimatedPriceVnd = item.EstimatedPriceVnd,
        IsChecked = item.IsChecked,
        RecipeTitle = item.Recipe?.Title,
        MergedFromRecipeCount = item.MergedFromRecipeCount
    };

    private static string MapIngredientCategory(string rawCategory) => rawCategory.ToLowerInvariant() switch
    {
        "vegetable" or "fruit" or "rau củ" or "rau" => "Rau củ & Trái cây",
        "meat" or "seafood" or "thịt" or "hải sản" => "Thịt & Thủy hải sản",
        "dairy" or "egg" or "trứng" or "sữa" => "Sữa & Trứng",
        "grain" or "spice" or "gia vị" or "đồ khô" => "Gia vị & Đồ khô",
        _ => "Khác"
    };
}
