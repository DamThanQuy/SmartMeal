using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common.Models;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.API.Controllers;

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
    public async Task<ActionResult<ApiResponse<List<Allergy>>>> GetAllergies()
    {
        var list = await _db.Allergies.AsNoTracking().ToListAsync();
        return Ok(ApiResponse<List<Allergy>>.Ok(list));
    }

    [HttpGet("medical-conditions")]
    public async Task<ActionResult<ApiResponse<List<MedicalCondition>>>> GetMedicalConditions()
    {
        var list = await _db.MedicalConditions.AsNoTracking().ToListAsync();
        return Ok(ApiResponse<List<MedicalCondition>>.Ok(list));
    }

    [HttpGet("tags")]
    public async Task<ActionResult<ApiResponse<List<Tag>>>> GetTags()
    {
        var list = await _db.Tags.AsNoTracking().ToListAsync();
        return Ok(ApiResponse<List<Tag>>.Ok(list));
    }
}
