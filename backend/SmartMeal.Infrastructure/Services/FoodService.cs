using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Foods;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class FoodService : IFoodService
{
    private readonly ApplicationDbContext _db;

    public FoodService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<FoodItemDto>> GetFoodsAsync(string? search, string? category, int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var query = _db.Ingredients
            .Include(i => i.Allergy)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(i => i.Name.ToLower().Contains(s) || (i.Description != null && i.Description.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            var c = category.Trim().ToLower();
            query = query.Where(i => i.Category.ToLower() == c);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderBy(i => i.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new FoodItemDto
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
                AllergyName = i.Allergy != null ? i.Allergy.Name : null
            })
            .ToListAsync();

        return new PagedResult<FoodItemDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<ApiResponse<FoodItemDto>> GetFoodByIdAsync(Guid id)
    {
        var i = await _db.Ingredients
            .Include(x => x.Allergy)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        if (i == null)
            return ApiResponse<FoodItemDto>.Fail("Không tìm thấy thực phẩm.");

        var dto = new FoodItemDto
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
            AllergyName = i.Allergy != null ? i.Allergy.Name : null
        };

        return ApiResponse<FoodItemDto>.Ok(dto);
    }
}
