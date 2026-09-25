using Microsoft.AspNetCore.Mvc;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Recipes;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecipeController : ControllerBase
{
    private readonly IRecipeService _recipeService;

    public RecipeController(IRecipeService recipeService)
    {
        _recipeService = recipeService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<RecipeDto>>>> GetRecipes(
        [FromQuery] string? search,
        [FromQuery] string? tag,
        [FromQuery] string? difficulty,
        [FromQuery] int? maxCalories)
    {
        var result = await _recipeService.GetRecipesAsync(search, tag, difficulty, maxCalories);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<RecipeDto>>> GetRecipeById(Guid id)
    {
        var result = await _recipeService.GetRecipeByIdAsync(id);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpPost("suggest-by-pantry")]
    public async Task<ActionResult<ApiResponse<List<RecipeDto>>>> SuggestByPantry([FromBody] PantrySuggestionRequestDto dto)
    {
        var result = await _recipeService.SuggestByPantryAsync(dto);
        return Ok(result);
    }
}
