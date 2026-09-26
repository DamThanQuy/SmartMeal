using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Recipes;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

[ApiController]
[Route("api/recipes")]
[Route("api/recipe")]
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

    [Authorize]
    [HttpPost("{id:guid}/favorite")]
    public async Task<ActionResult<ApiResponse<FavoriteToggleResponseDto>>> ToggleFavorite(Guid id)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized(ApiResponse<FavoriteToggleResponseDto>.Fail("Chưa đăng nhập."));

        var result = await _recipeService.ToggleFavoriteAsync(userId, id);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("favorites")]
    public async Task<ActionResult<ApiResponse<List<RecipeDto>>>> GetFavorites()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized(ApiResponse<List<RecipeDto>>.Fail("Chưa đăng nhập."));

        var result = await _recipeService.GetFavoritesAsync(userId);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("collections")]
    public async Task<ActionResult<ApiResponse<List<RecipeCollectionDto>>>> GetCollections()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized(ApiResponse<List<RecipeCollectionDto>>.Fail("Chưa đăng nhập."));

        var result = await _recipeService.GetCollectionsAsync(userId);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("collections")]
    public async Task<ActionResult<ApiResponse<RecipeCollectionDto>>> CreateCollection([FromBody] CreateCollectionRequestDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized(ApiResponse<RecipeCollectionDto>.Fail("Chưa đăng nhập."));

        var result = await _recipeService.CreateCollectionAsync(userId, dto);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("collections/{collectionId:guid}/items")]
    public async Task<ActionResult<ApiResponse<bool>>> AddRecipeToCollection(Guid collectionId, [FromBody] AddRecipeToCollectionDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized(ApiResponse<bool>.Fail("Chưa đăng nhập."));

        var result = await _recipeService.AddRecipeToCollectionAsync(userId, collectionId, dto.RecipeId);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }
}
