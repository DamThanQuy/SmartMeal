using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
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

    /// <summary>Id người dùng nếu request có token hợp lệ; null khi ẩn danh (các endpoint công khai vẫn dùng được).</summary>
    private Guid? OptionalUserId() => this.TryGetUserId(out var id) ? id : null;

    /// <summary>
    /// Danh sách công thức. <c>data</c> luôn là mảng; thông tin phân trang nằm ở header
    /// <c>X-Total-Count</c>, <c>X-Page</c>, <c>X-Page-Size</c>, <c>X-Total-Pages</c>.
    /// Không gửi <c>page</c>/<c>pageSize</c> = trả tất cả.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<RecipeDto>>>> GetRecipes(
        [FromQuery] RecipeQuery query,
        [FromQuery] int? maxCookTimeMinutes)
    {
        // Tên tham số trong hợp đồng API là maxCookTimeMinutes (tổng thời gian chuẩn bị + nấu).
        query.MaxTotalMinutes ??= maxCookTimeMinutes;

        var userId = OptionalUserId();
        if (query.ExcludeMyAllergens && userId is null)
        {
            return Unauthorized(ApiResponse<List<RecipeDto>>.Fail("Cần đăng nhập để lọc theo dị ứng của bạn.", null, ApiErrorKind.Unauthorized));
        }

        var result = await _recipeService.GetRecipesAsync(query, userId);
        if (!result.Success || result.Data is null)
        {
            return this.ToActionResult(ApiResponse<List<RecipeDto>>.Fail(result.Message, result.Errors, result.ErrorKind));
        }

        var paged = result.Data;
        Response.Headers["X-Total-Count"] = paged.TotalCount.ToString();
        Response.Headers["X-Page"] = paged.Page.ToString();
        Response.Headers["X-Page-Size"] = paged.PageSize.ToString();
        Response.Headers["X-Total-Pages"] = paged.TotalPages.ToString();
        Response.Headers.AccessControlExposeHeaders = "X-Total-Count,X-Page,X-Page-Size,X-Total-Pages";

        return Ok(ApiResponse<List<RecipeDto>>.Ok(paged.Items, result.Message));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<RecipeDto>>> GetRecipeById(Guid id) =>
        this.ToActionResult(await _recipeService.GetRecipeByIdAsync(id, OptionalUserId()));

    /// <summary>Gợi ý theo tủ lạnh. Có token → tự loại công thức chứa chất gây dị ứng của người dùng.</summary>
    [HttpPost("suggest-by-pantry")]
    public async Task<ActionResult<ApiResponse<List<RecipeDto>>>> SuggestByPantry([FromBody] PantrySuggestionRequestDto dto) =>
        this.ToActionResult(await _recipeService.SuggestByPantryAsync(dto, OptionalUserId()));

    [Authorize]
    [HttpPost("{id:guid}/favorite")]
    public async Task<ActionResult<ApiResponse<FavoriteToggleResponseDto>>> ToggleFavorite(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<FavoriteToggleResponseDto>();
        return this.ToActionResult(await _recipeService.ToggleFavoriteAsync(userId, id));
    }

    [Authorize]
    [HttpGet("favorites")]
    public async Task<ActionResult<ApiResponse<List<RecipeDto>>>> GetFavorites()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<List<RecipeDto>>();
        return this.ToActionResult(await _recipeService.GetFavoritesAsync(userId));
    }

    [Authorize]
    [HttpGet("collections")]
    public async Task<ActionResult<ApiResponse<List<RecipeCollectionDto>>>> GetCollections()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<List<RecipeCollectionDto>>();
        return this.ToActionResult(await _recipeService.GetCollectionsAsync(userId));
    }

    [Authorize]
    [HttpGet("collections/{collectionId:guid}")]
    public async Task<ActionResult<ApiResponse<RecipeCollectionDto>>> GetCollection(Guid collectionId)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<RecipeCollectionDto>();
        return this.ToActionResult(await _recipeService.GetCollectionAsync(userId, collectionId));
    }

    [Authorize]
    [HttpPost("collections")]
    public async Task<ActionResult<ApiResponse<RecipeCollectionDto>>> CreateCollection([FromBody] CreateCollectionRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<RecipeCollectionDto>();
        return this.ToActionResult(await _recipeService.CreateCollectionAsync(userId, dto));
    }

    [Authorize]
    [HttpPatch("collections/{collectionId:guid}")]
    public async Task<ActionResult<ApiResponse<RecipeCollectionDto>>> UpdateCollection(Guid collectionId, [FromBody] UpdateCollectionRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<RecipeCollectionDto>();
        return this.ToActionResult(await _recipeService.UpdateCollectionAsync(userId, collectionId, dto));
    }

    [Authorize]
    [HttpDelete("collections/{collectionId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteCollection(Guid collectionId)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _recipeService.DeleteCollectionAsync(userId, collectionId));
    }

    [Authorize]
    [HttpPost("collections/{collectionId:guid}/items")]
    public async Task<ActionResult<ApiResponse<bool>>> AddRecipeToCollection(Guid collectionId, [FromBody] AddRecipeToCollectionDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _recipeService.AddRecipeToCollectionAsync(userId, collectionId, dto.RecipeId));
    }

    [Authorize]
    [HttpDelete("collections/{collectionId:guid}/items/{recipeId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveRecipeFromCollection(Guid collectionId, Guid recipeId)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _recipeService.RemoveRecipeFromCollectionAsync(userId, collectionId, recipeId));
    }
}
