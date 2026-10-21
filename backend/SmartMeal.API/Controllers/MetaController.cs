using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Meta;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Controller cung cấp danh mục siêu dữ liệu (Metadata / Master Data) tĩnh của hệ thống:
/// - Danh mục dị ứng thực phẩm chuẩn (Allergies): Hải sản, đậu phộng, trứng, sữa, v.v.
/// - Danh mục bệnh lý nền dinh dưỡng (Medical Conditions): Tiểu đường, cao huyết áp, gout, đau dạ dày, v.v.
/// - Danh mục thẻ phân loại món ăn (Tags): Eat Clean, Keto, Low Carb, Chay, v.v.
/// Dữ liệu công khai, không yêu cầu đăng nhập, mỗi mục có trường 'Code' định danh ổn định giúp client mapping giao diện đa ngôn ngữ.
/// Tự động cache trong bộ nhớ (In-Memory Cache) 12 giờ để đạt hiệu năng tối đa và giảm tải truy vấn DB.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class MetaController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IMemoryCache _cache;

    private const string AllergiesCacheKey = "meta_allergies";
    private const string ConditionsCacheKey = "meta_conditions";
    private const string TagsCacheKey = "meta_tags";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(12);

    /// <summary>
    /// Khởi tạo instance mới của <see cref="MetaController"/>.
    /// </summary>
    /// <param name="db">Database Context truy xuất trực tiếp bảng danh mục hệ thống.</param>
    /// <param name="cache">Bộ nhớ đệm In-Memory để lưu kết quả danh mục tĩnh.</param>
    public MetaController(ApplicationDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    /// <summary>
    /// Lấy danh sách các loại dị ứng thực phẩm tiêu chuẩn được hệ thống hỗ trợ cảnh báo:
    /// Dùng trong màn hình khảo sát sức khỏe (Onboarding Survey) và bộ lọc an toàn thực phẩm.
    /// </summary>
    /// <returns>Danh sách <see cref="MetaItemDto"/> gồm mã Id, Code, Tên và Mô tả chất dị ứng.</returns>
    [HttpGet("allergies")]
    public async Task<ActionResult<ApiResponse<List<MetaItemDto>>>> GetAllergies()
    {
        var list = await _cache.GetOrCreateAsync(AllergiesCacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            return await _db.Allergies.AsNoTracking()
                .OrderBy(a => a.Id)
                .Select(a => new MetaItemDto { Id = a.Id, Code = a.Code, Name = a.Name, Description = a.Description })
                .ToListAsync();
        });
        return Ok(ApiResponse<List<MetaItemDto>>.Ok(list ?? new List<MetaItemDto>()));
    }

    /// <summary>
    /// Lấy danh mục các bệnh lý và tình trạng sức khỏe đặc biệt cần tuân thủ chế độ ăn kiêng:
    /// Dùng để kích hoạt các luật dinh dưỡng (Health Condition Rules) tự động giới hạn đường, muối, purin trong thực đơn.
    /// </summary>
    /// <returns>Danh sách <see cref="MetaItemDto"/> gồm các bệnh lý được hỗ trợ.</returns>
    [HttpGet("medical-conditions")]
    public async Task<ActionResult<ApiResponse<List<MetaItemDto>>>> GetMedicalConditions()
    {
        var list = await _cache.GetOrCreateAsync(ConditionsCacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            return await _db.MedicalConditions.AsNoTracking()
                .OrderBy(c => c.Id)
                .Select(c => new MetaItemDto { Id = c.Id, Code = c.Code, Name = c.Name, Description = c.Description })
                .ToListAsync();
        });
        return Ok(ApiResponse<List<MetaItemDto>>.Ok(list ?? new List<MetaItemDto>()));
    }

    /// <summary>
    /// Lấy danh mục các thẻ gắn nhãn (Tags) phân loại phong cách ẩm thực và chế độ ăn uống:
    /// Dùng để gán nhãn cho công thức nấu ăn, món ăn và hỗ trợ tìm kiếm/lọc nhanh trên ứng dụng.
    /// </summary>
    /// <returns>Danh sách <see cref="MetaItemDto"/> các thẻ phân loại.</returns>
    [HttpGet("tags")]
    public async Task<ActionResult<ApiResponse<List<MetaItemDto>>>> GetTags()
    {
        var list = await _cache.GetOrCreateAsync(TagsCacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            return await _db.Tags.AsNoTracking()
                .OrderBy(t => t.Id)
                .Select(t => new MetaItemDto { Id = t.Id, Code = t.Code, Name = t.Name })
                .ToListAsync();
        });
        return Ok(ApiResponse<List<MetaItemDto>>.Ok(list ?? new List<MetaItemDto>()));
    }
}
