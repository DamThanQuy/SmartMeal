using Microsoft.AspNetCore.Mvc;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Foods;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FoodsController : ControllerBase
{
    private readonly IFoodService _foodService;

    public FoodsController(IFoodService foodService)
    {
        _foodService = foodService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<FoodItemDto>>>> GetFoods(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _foodService.GetFoodsAsync(search, category, page, pageSize);
        return Ok(ApiResponse<PagedResult<FoodItemDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<FoodItemDto>>> GetFoodById(Guid id)
    {
        var result = await _foodService.GetFoodByIdAsync(id);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }
}
