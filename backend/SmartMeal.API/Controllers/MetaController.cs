using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Meta;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.API.Controllers;

/// <summary>Danh mục dùng cho hồ sơ sức khỏe. Mỗi mục có <c>code</c> ổn định để client ánh xạ thay vì dựa vào id/tên.</summary>
[ApiController]
[Route("api/[controller]")]
public class MetaController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public MetaController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("allergies")]
    public async Task<ActionResult<ApiResponse<List<MetaItemDto>>>> GetAllergies()
    {
        var list = await _db.Allergies.AsNoTracking()
            .OrderBy(a => a.Id)
            .Select(a => new MetaItemDto { Id = a.Id, Code = a.Code, Name = a.Name, Description = a.Description })
            .ToListAsync();
        return Ok(ApiResponse<List<MetaItemDto>>.Ok(list));
    }

    [HttpGet("medical-conditions")]
    public async Task<ActionResult<ApiResponse<List<MetaItemDto>>>> GetMedicalConditions()
    {
        var list = await _db.MedicalConditions.AsNoTracking()
            .OrderBy(c => c.Id)
            .Select(c => new MetaItemDto { Id = c.Id, Code = c.Code, Name = c.Name, Description = c.Description })
            .ToListAsync();
        return Ok(ApiResponse<List<MetaItemDto>>.Ok(list));
    }

    [HttpGet("tags")]
    public async Task<ActionResult<ApiResponse<List<MetaItemDto>>>> GetTags()
    {
        var list = await _db.Tags.AsNoTracking()
            .OrderBy(t => t.Id)
            .Select(t => new MetaItemDto { Id = t.Id, Code = t.Code, Name = t.Name })
            .ToListAsync();
        return Ok(ApiResponse<List<MetaItemDto>>.Ok(list));
    }
}
