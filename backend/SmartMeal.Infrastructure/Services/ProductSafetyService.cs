using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.AI;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Kiểm tra sản phẩm theo mã vạch chỉ bằng dữ liệu trong CSDL (BR-120/140): chất gây dị ứng của sản phẩm so với hồ sơ, và
/// đường/natri/chất béo/calo trên 100 g so với ngưỡng. Không có sản phẩm thì báo 404 — không đưa mã vạch cho AI đoán.
/// </summary>
public class ProductSafetyService : IProductSafetyService
{
    public const string ProductNotFoundError = "product_not_found";

    private readonly ApplicationDbContext _db;
    private readonly IFoodService _foods;
    private readonly ProductSafetyOptions _limits;

    public ProductSafetyService(ApplicationDbContext db, IFoodService foods, IOptions<ProductSafetyOptions> limits)
    {
        _db = db;
        _foods = foods;
        _limits = limits.Value;
    }

    public async Task<ApiResponse<CheckSafetyResponseDto>> CheckBarcodeAsync(string barcode, Guid userId)
    {
        var lookup = await _foods.GetFoodByBarcodeAsync(barcode, userId);
        if (!lookup.Success || lookup.Data is null)
        {
            return lookup.ErrorKind == ApiErrorKind.NotFound
                ? ApiResponse<CheckSafetyResponseDto>.Fail(
                    "Chưa có sản phẩm với mã vạch này trong hệ thống. Bạn có thể quét nhãn dinh dưỡng hoặc nhập thủ công.",
                    new List<string> { ProductNotFoundError },
                    ApiErrorKind.NotFound)
                : ApiResponse<CheckSafetyResponseDto>.Fail(lookup.Message, lookup.Errors, lookup.ErrorKind);
        }

        var food = lookup.Data;
        var profile = await _db.HealthProfiles.AsNoTracking()
            .Include(hp => hp.UserAllergies).ThenInclude(ua => ua.Allergy)
            .Include(hp => hp.UserConditions).ThenInclude(uc => uc.MedicalCondition)
            .AsSplitQuery()
            .FirstOrDefaultAsync(hp => hp.UserId == userId);
        var matched = (profile?.UserAllergies.Select(ua => ua.Allergy) ?? Enumerable.Empty<Domain.Entities.Allergy>())
            .Where(a => food.AllergyIds.Contains(a.Id))
            .OrderBy(a => a.Id)
            .ToList();
        var conditionCodes = profile?.UserConditions.Select(uc => uc.MedicalCondition.Code).ToList() ?? new List<string>();

        var result = new CheckSafetyResponseDto
        {
            Source = "database",
            IsDemo = false,
            Product = new ScannedProductDto
            {
                FoodId = food.Id,
                Name = food.Name,
                Barcode = food.Barcode,
                IsVerified = food.IsVerified,
                IsUserCreated = food.IsUserCreated,
                AllergyIds = food.AllergyIds,
                MatchedAllergyIds = matched.Select(a => a.Id).ToList()
            },
            // CSDL chỉ lưu chất gây dị ứng của sản phẩm, không lưu danh sách thành phần.
            DetectedIngredients = new List<string>(),
            ExtractedNutrition = new ExtractedNutritionFactsDto
            {
                Basis = "per100g",
                ServingSize = "100 g",
                ServingGrams = 100,
                CaloriesPerServing = food.CaloriesPer100g,
                ProteinGrams = food.ProteinPer100g,
                CarbsGrams = food.CarbsPer100g,
                TotalFatGrams = food.FatPer100g,
                SugarGrams = food.SugarPer100g,
                SodiumMg = food.SodiumMgPer100g
            },
            Alerts = matched.Select(a => new SafetyAlertDto
            {
                Type = "ALLERGY",
                Severity = "DANGER",
                Message = $"CẢNH BÁO: sản phẩm chứa {a.Name} — nằm trong danh sách dị ứng của bạn."
            }).ToList()
        };

        // "Dị ứng khác" tự nhập chỉ so được theo tên/mô tả sản phẩm (CSDL không lưu danh sách thành phần).
        if (CustomAllergens.FindMatch(CustomAllergens.Keywords(profile?.OtherAllergies), new[] { food.Name, food.Description }) is { } keyword)
        {
            result.Alerts.Add(new SafetyAlertDto
            {
                Type = "ALLERGY",
                Severity = "DANGER",
                Message = $"CẢNH BÁO: sản phẩm có thể chứa \"{keyword}\" — nằm trong dị ứng khác bạn đã khai báo."
            });
        }

        if (!food.IsVerified)
        {
            result.Alerts.Add(new SafetyAlertDto
            {
                Type = "UNVERIFIED",
                Severity = "INFO",
                Message = food.IsUserCreated
                    ? "Số liệu do bạn tự nhập, chưa được kiểm chứng."
                    : "Số liệu và thông tin dị ứng chưa được chuyên gia kiểm chứng — chỉ mang tính tham khảo, hãy đọc kỹ nhãn trên bao bì."
            });
        }

        NutrientAlerts.Apply(result, conditionCodes, _limits);
        result.IsSafe = !result.Alerts.Any(a => a.Severity == "DANGER");

        return ApiResponse<CheckSafetyResponseDto>.Ok(result, "Đã kiểm tra sản phẩm theo dữ liệu trong hệ thống.");
    }
}
