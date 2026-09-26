using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Grocery;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class GroceryService : IGroceryService
{
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
            .Include(g => g.Recipe)
            .Where(g => g.UserId == userId)
            .OrderBy(g => g.Category)
            .ThenBy(g => g.IngredientName)
            .ToListAsync();

        var categories = items
            .GroupBy(i => i.Category)
            .Select(g => new GroceryCategoryDto
            {
                CategoryName = g.Key,
                Items = g.Select(item => new GroceryItemDto
                {
                    Id = item.Id,
                    IngredientName = item.IngredientName,
                    Amount = Math.Round(item.Amount, 1),
                    Unit = item.Unit,
                    Category = item.Category,
                    EstimatedPriceVnd = item.EstimatedPriceVnd,
                    IsChecked = item.IsChecked,
                    RecipeTitle = item.Recipe?.Title
                }).ToList()
            }).ToList();

        var summary = new GrocerySummaryDto
        {
            TotalItems = items.Count,
            CheckedItems = items.Count(i => i.IsChecked),
            TotalEstimatedCostVnd = items.Sum(i => i.EstimatedPriceVnd),
            Categories = categories
        };

        return ApiResponse<GrocerySummaryDto>.Ok(summary, "Lấy danh sách đi chợ thành công.");
    }

    public async Task<ApiResponse<GrocerySummaryDto>> GenerateFromMealPlanAsync(Guid userId, GenerateGroceryRequestDto dto)
    {
        if (dto.ClearExisting)
        {
            var existingItems = await _db.GroceryItems.Where(g => g.UserId == userId).ToListAsync();
            if (existingItems.Any())
            {
                _db.GroceryItems.RemoveRange(existingItems);
            }
        }

        // 1. Fetch meal plans in range with full ingredient details
        var plans = await _db.MealPlans
            .Include(mp => mp.Recipe)
                .ThenInclude(r => r.RecipeIngredients)
                    .ThenInclude(ri => ri.Ingredient)
            .Where(mp => mp.UserId == userId && mp.PlanDate >= dto.StartDate && mp.PlanDate <= dto.EndDate)
            .ToListAsync();

        if (!plans.Any())
        {
            return ApiResponse<GrocerySummaryDto>.Fail("Không tìm thấy thực đơn nào trong khoảng thời gian đã chọn để tạo danh sách đi chợ.");
        }

        // 2. Aggregate all ingredients
        var aggregatedDict = new Dictionary<string, (string Name, double Amount, string Unit, string Category, decimal Price, Guid? RecipeId)>();

        foreach (var plan in plans)
        {
            foreach (var ri in plan.Recipe.RecipeIngredients)
            {
                var ingredient = ri.Ingredient;
                var key = $"{ingredient.Name.Trim().ToLowerInvariant()}_{ri.Unit.Trim().ToLowerInvariant()}";

                var category = MapIngredientCategory(ingredient.Category);
                var estPrice = ingredient.EstimatedPriceVnd > 0
                    ? ingredient.EstimatedPriceVnd * (decimal)(ri.Amount / 100.0)
                    : 15000m; // Fallback estimate

                if (aggregatedDict.ContainsKey(key))
                {
                    var current = aggregatedDict[key];
                    aggregatedDict[key] = (
                        current.Name,
                        current.Amount + ri.Amount,
                        current.Unit,
                        current.Category,
                        current.Price + estPrice,
                        current.RecipeId
                    );
                }
                else
                {
                    aggregatedDict[key] = (
                        ingredient.Name,
                        ri.Amount,
                        ri.Unit,
                        category,
                        estPrice,
                        plan.RecipeId
                    );
                }
            }
        }

        // 3. Save new grocery items
        var newGroceryItems = aggregatedDict.Values.Select(v => new GroceryItem
        {
            UserId = userId,
            IngredientName = v.Name,
            Amount = Math.Round(v.Amount, 1),
            Unit = v.Unit,
            Category = v.Category,
            EstimatedPriceVnd = Math.Round(v.Price, 0),
            IsChecked = false,
            RecipeId = v.RecipeId
        }).ToList();

        await _db.GroceryItems.AddRangeAsync(newGroceryItems);
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
            IsChecked = false
        };

        await _db.GroceryItems.AddAsync(item);
        await _db.SaveChangesAsync();

        var resultDto = new GroceryItemDto
        {
            Id = item.Id,
            IngredientName = item.IngredientName,
            Amount = item.Amount,
            Unit = item.Unit,
            Category = item.Category,
            EstimatedPriceVnd = item.EstimatedPriceVnd,
            IsChecked = item.IsChecked
        };

        return ApiResponse<GroceryItemDto>.Ok(resultDto, $"Đã thêm '{item.IngredientName}' vào danh sách đi chợ.");
    }

    public async Task<ApiResponse<GroceryItemDto>> ToggleItemCheckedAsync(Guid userId, Guid itemId, bool isChecked)
    {
        var item = await _db.GroceryItems.FirstOrDefaultAsync(g => g.Id == itemId && g.UserId == userId);
        if (item == null)
        {
            return ApiResponse<GroceryItemDto>.Fail("Không tìm thấy món hàng trong danh sách đi chợ.");
        }

        item.IsChecked = isChecked;
        await _db.SaveChangesAsync();

        var resultDto = new GroceryItemDto
        {
            Id = item.Id,
            IngredientName = item.IngredientName,
            Amount = item.Amount,
            Unit = item.Unit,
            Category = item.Category,
            EstimatedPriceVnd = item.EstimatedPriceVnd,
            IsChecked = item.IsChecked
        };

        return ApiResponse<GroceryItemDto>.Ok(resultDto, item.IsChecked ? "Đã đánh dấu đã mua." : "Đã bỏ đánh dấu mua.");
    }

    public async Task<ApiResponse<bool>> DeleteItemAsync(Guid userId, Guid itemId)
    {
        var item = await _db.GroceryItems.FirstOrDefaultAsync(g => g.Id == itemId && g.UserId == userId);
        if (item == null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy món hàng cần xóa.");
        }

        _db.GroceryItems.Remove(item);
        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Đã xóa nguyên liệu khỏi danh sách đi chợ.");
    }

    public async Task<ApiResponse<bool>> ClearCheckedItemsAsync(Guid userId)
    {
        var checkedItems = await _db.GroceryItems.Where(g => g.UserId == userId && g.IsChecked).ToListAsync();
        if (checkedItems.Any())
        {
            _db.GroceryItems.RemoveRange(checkedItems);
            await _db.SaveChangesAsync();
        }

        return ApiResponse<bool>.Ok(true, "Đã dọn dẹp các món hàng đã mua.");
    }

    private static string MapIngredientCategory(string rawCategory) => rawCategory.ToLowerInvariant() switch
    {
        "vegetable" or "fruit" or "rau củ" or "rau" => "Rau củ & Trái cây",
        "meat" or "seafood" or "thịt" or "hải sản" => "Thịt & Thủy hải sản",
        "dairy" or "egg" or "trứng" or "sữa" => "Sữa & Trứng",
        "grain" or "spice" or "gia vị" or "đồ khô" => "Gia vị & Đồ khô",
        _ => "Khác"
    };
}
