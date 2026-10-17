using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Recipes;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Controller quản lý công thức nấu ăn (Recipes) và bộ sưu tập ẩm thực (Collections):
/// - Tìm kiếm, lọc công thức theo danh mục, thời gian nấu, mức độ calo, và loại trừ chất gây dị ứng theo hồ sơ cá nhân.
/// - Xem chi tiết công thức: nguyên liệu, các bước chế biến từng bước và cảnh báo tương thích sức khỏe.
/// - Gợi ý món ăn thông minh theo nguyên liệu sẵn có trong tủ lạnh (Pantry Suggestion).
/// - Đánh dấu món ăn yêu thích và quản lý danh sách yêu thích.
/// - Quản lý bộ sưu tập công thức cá nhân: tạo mới, cập nhật, xóa, thêm/bớt món ăn.
/// - Chia sẻ bộ sưu tập qua liên kết công khai an toàn (Share Token).
/// </summary>
[ApiController]
[Route("api/recipes")]
[Route("api/recipe")]
public class RecipeController : ControllerBase
{
    private readonly IRecipeService _recipeService;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="RecipeController"/>.
    /// </summary>
    /// <param name="recipeService">Dịch vụ xử lý nghiệp vụ công thức nấu ăn, gợi ý tủ lạnh và bộ sưu tập.</param>
    public RecipeController(IRecipeService recipeService)
    {
        _recipeService = recipeService;
    }

    /// <summary>
    /// Lấy định danh UserId nếu request gửi kèm Bearer Token hợp lệ;
    /// trả về null khi truy cập công khai/ẩn danh để cho phép khách vãng lai vẫn tra cứu được công thức.
    /// </summary>
    /// <returns>Guid của người dùng hoặc null nếu ẩn danh.</returns>
    private Guid? OptionalUserId() => this.TryGetUserId(out var id) ? id : null;

    /// <summary>
    /// Tra cứu và lọc danh sách công thức nấu ăn:
    /// - Hỗ trợ lọc theo từ khóa, thời gian chế biến tối đa, loại bữa ăn, tag dinh dưỡng (Keto, Eat Clean,...).
    /// - Lọc theo chất gây dị ứng (ExcludeMyAllergens = true): Yêu cầu người dùng phải đăng nhập để hệ thống đọc hồ sơ dị ứng cá nhân.
    /// - Kết quả trả về danh sách mảng trong body, thông tin phân trang được đính kèm ở response headers (X-Total-Count, X-Page, X-Page-Size, X-Total-Pages).
    /// </summary>
    /// <param name="query">Các tiêu chí tìm kiếm và phân trang.</param>
    /// <param name="maxCookTimeMinutes">Tổng thời gian chuẩn bị và nấu tối đa (phút).</param>
    /// <returns>Danh sách <see cref="RecipeDto"/> các công thức nấu ăn phù hợp.</returns>
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

    /// <summary>
    /// Xem chi tiết một công thức nấu ăn theo mã định danh duy nhất (RecipeId):
    /// Trả về mô tả, hình ảnh, thời gian nấu, bảng thành phần dinh dưỡng chi tiết, danh sách nguyên liệu và hướng dẫn các bước nấu.
    /// Nếu có đăng nhập, hệ thống sẽ tự động gắn cờ IsFavorite và phân tích các cảnh báo dị ứng/bệnh lý tương thích.
    /// </summary>
    /// <param name="id">Mã định danh duy nhất (GUID) của công thức nấu ăn.</param>
    /// <returns>Đối tượng <see cref="RecipeDto"/> chi tiết món ăn.</returns>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<RecipeDto>>> GetRecipeById(Guid id) =>
        this.ToActionResult(await _recipeService.GetRecipeByIdAsync(id, OptionalUserId()));

    /// <summary>
    /// Gợi ý công thức nấu ăn theo danh sách nguyên liệu sẵn có trong tủ lạnh (Pantry Suggestion):
    /// - Nhận diện các món có thể nấu được ngay từ các nguyên liệu người dùng đang có.
    /// - Tự động đối chiếu hồ sơ sức khỏe: loại trừ các công thức vi phạm dị ứng của người dùng (nếu có đăng nhập).
    /// </summary>
    /// <param name="dto">Danh sách nguyên liệu hiện có trong gian bếp/tủ lạnh.</param>
    /// <returns>Danh sách <see cref="RecipeDto"/> các công thức nấu ăn khả thi được sắp xếp theo độ trùng khớp nguyên liệu.</returns>
    [HttpPost("suggest-by-pantry")]
    public async Task<ActionResult<ApiResponse<List<RecipeDto>>>> SuggestByPantry([FromBody] PantrySuggestionRequestDto dto) =>
        this.ToActionResult(await _recipeService.SuggestByPantryAsync(dto, OptionalUserId()));

    /// <summary>
    /// Bật/Tắt trạng thái yêu thích (Favorite Toggle) cho một công thức nấu ăn:
    /// - Nếu chưa thích: Thêm vào danh sách yêu thích cá nhân.
    /// - Nếu đã thích trước đó: Bỏ khỏi danh sách yêu thích.
    /// Yêu cầu xác thực tài khoản qua Bearer Token.
    /// </summary>
    /// <param name="id">Mã định danh duy nhất của công thức.</param>
    /// <returns>Đối tượng <see cref="FavoriteToggleResponseDto"/> chứa trạng thái yêu thích mới (IsFavorite: true/false).</returns>
    [Authorize]
    [HttpPost("{id:guid}/favorite")]
    public async Task<ActionResult<ApiResponse<FavoriteToggleResponseDto>>> ToggleFavorite(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<FavoriteToggleResponseDto>();
        return this.ToActionResult(await _recipeService.ToggleFavoriteAsync(userId, id));
    }

    /// <summary>
    /// Lấy toàn bộ danh sách các công thức nấu ăn mà người dùng hiện tại đã đánh dấu yêu thích.
    /// </summary>
    /// <returns>Danh sách <see cref="RecipeDto"/> các công thức yêu thích.</returns>
    [Authorize]
    [HttpGet("favorites")]
    public async Task<ActionResult<ApiResponse<List<RecipeDto>>>> GetFavorites()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<List<RecipeDto>>();
        return this.ToActionResult(await _recipeService.GetFavoritesAsync(userId));
    }

    /// <summary>
    /// Lấy danh sách các bộ sưu tập công thức cá nhân do người dùng hiện tại tạo ra:
    /// Ví dụ: "Món ăn giảm cân", "Thực đơn bữa tối gia đình", "Món chay thanh đạm".
    /// </summary>
    /// <returns>Danh sách các bộ sưu tập <see cref="RecipeCollectionDto"/> kèm số lượng món ăn trong từng bộ.</returns>
    [Authorize]
    [HttpGet("collections")]
    public async Task<ActionResult<ApiResponse<List<RecipeCollectionDto>>>> GetCollections()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<List<RecipeCollectionDto>>();
        return this.ToActionResult(await _recipeService.GetCollectionsAsync(userId));
    }

    /// <summary>
    /// Lấy thông tin chi tiết một bộ sưu tập công thức cá nhân theo CollectionId:
    /// Bao gồm tên bộ sưu tập, mô tả, ảnh bìa và danh sách đầy đủ các công thức thành phần.
    /// </summary>
    /// <param name="collectionId">Mã định danh duy nhất của bộ sưu tập.</param>
    /// <returns>Đối tượng <see cref="RecipeCollectionDto"/> chứa danh sách công thức chi tiết.</returns>
    [Authorize]
    [HttpGet("collections/{collectionId:guid}")]
    public async Task<ActionResult<ApiResponse<RecipeCollectionDto>>> GetCollection(Guid collectionId)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<RecipeCollectionDto>();
        return this.ToActionResult(await _recipeService.GetCollectionAsync(userId, collectionId));
    }

    /// <summary>
    /// Tạo một bộ sưu tập công thức nấu ăn mới cho người dùng hiện tại:
    /// Cho phép thiết lập tên, mô tả và trạng thái riêng tư/công khai.
    /// </summary>
    /// <param name="dto">Dữ liệu khởi tạo bộ sưu tập.</param>
    /// <returns>Đối tượng <see cref="RecipeCollectionDto"/> vừa được tạo thành công.</returns>
    [Authorize]
    [HttpPost("collections")]
    public async Task<ActionResult<ApiResponse<RecipeCollectionDto>>> CreateCollection([FromBody] CreateCollectionRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<RecipeCollectionDto>();
        return this.ToActionResult(await _recipeService.CreateCollectionAsync(userId, dto));
    }

    /// <summary>
    /// Cập nhật thông tin cơ bản của bộ sưu tập (Tên, mô tả, ảnh bìa):
    /// Chỉ người dùng sở hữu bộ sưu tập mới có quyền chỉnh sửa (trả về 403 nếu không phải chủ sở hữu).
    /// </summary>
    /// <param name="collectionId">Mã định danh duy nhất của bộ sưu tập cần sửa.</param>
    /// <param name="dto">Dữ liệu các trường muốn cập nhật.</param>
    /// <returns>Bộ sưu tập sau khi cập nhật thành công.</returns>
    [Authorize]
    [HttpPatch("collections/{collectionId:guid}")]
    public async Task<ActionResult<ApiResponse<RecipeCollectionDto>>> UpdateCollection(Guid collectionId, [FromBody] UpdateCollectionRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<RecipeCollectionDto>();
        return this.ToActionResult(await _recipeService.UpdateCollectionAsync(userId, collectionId, dto));
    }

    /// <summary>
    /// Xóa vĩnh viễn một bộ sưu tập công thức của người dùng:
    /// Chỉ xóa danh mục bộ sưu tập cá nhân, không xóa các công thức nấu ăn gốc trong cơ sở dữ liệu hệ thống.
    /// </summary>
    /// <param name="collectionId">Mã định danh duy nhất của bộ sưu tập cần xóa.</param>
    /// <returns>True nếu xóa thành công.</returns>
    [Authorize]
    [HttpDelete("collections/{collectionId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteCollection(Guid collectionId)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _recipeService.DeleteCollectionAsync(userId, collectionId));
    }

    /// <summary>
    /// Thêm một công thức nấu ăn vào bộ sưu tập chỉ định:
    /// Kiểm tra quyền sở hữu bộ sưu tập trước khi thêm.
    /// </summary>
    /// <param name="collectionId">Mã định danh bộ sưu tập.</param>
    /// <param name="dto">Dữ liệu chứa RecipeId của công thức cần thêm vào.</param>
    /// <returns>True nếu thêm thành công.</returns>
    [Authorize]
    [HttpPost("collections/{collectionId:guid}/items")]
    public async Task<ActionResult<ApiResponse<bool>>> AddRecipeToCollection(Guid collectionId, [FromBody] AddRecipeToCollectionDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _recipeService.AddRecipeToCollectionAsync(userId, collectionId, dto.RecipeId));
    }

    /// <summary>
    /// Xóa bỏ một công thức nấu ăn ra khỏi bộ sưu tập:
    /// </summary>
    /// <param name="collectionId">Mã định danh của bộ sưu tập.</param>
    /// <param name="recipeId">Mã định danh của công thức cần gỡ bỏ.</param>
    /// <returns>True nếu gỡ bỏ thành công.</returns>
    [Authorize]
    [HttpDelete("collections/{collectionId:guid}/items/{recipeId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveRecipeFromCollection(Guid collectionId, Guid recipeId)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _recipeService.RemoveRecipeFromCollectionAsync(userId, collectionId, recipeId));
    }

    /// <summary>
    /// Tạo hoặc lấy mã liên kết chia sẻ công khai (Share Link) cho bộ sưu tập:
    /// - Chỉ chủ sở hữu bộ sưu tập mới được quyền tạo liên kết chia sẻ.
    /// - Nếu đã tồn tại liên kết hợp lệ, trả về mã cũ; nếu truyền tham số 'regenerate = true', hệ thống sẽ sinh chuỗi token mới và vô hiệu hóa token cũ.
    /// </summary>
    /// <param name="collectionId">Mã định danh bộ sưu tập cần chia sẻ.</param>
    /// <param name="regenerate">Cờ yêu cầu làm mới mã token chia sẻ (mặc định là false).</param>
    /// <returns>Đối tượng <see cref="CollectionShareDto"/> chứa URL và mã share token.</returns>
    [Authorize]
    [HttpPost("collections/{collectionId:guid}/share")]
    public async Task<ActionResult<ApiResponse<CollectionShareDto>>> CreateShareLink(Guid collectionId, [FromQuery] bool regenerate = false)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<CollectionShareDto>();
        return this.ToActionResult(await _recipeService.CreateShareLinkAsync(userId, collectionId, regenerate));
    }

    /// <summary>
    /// Thu hồi (vô hiệu hóa) liên kết chia sẻ công khai của bộ sưu tập:
    /// Sau khi thu hồi, những người có đường dẫn cũ sẽ không thể xem bộ sưu tập này nữa. Thao tác mang tính idempotent.
    /// </summary>
    /// <param name="collectionId">Mã định danh duy nhất của bộ sưu tập cần thu hồi liên kết.</param>
    /// <returns>True nếu thu hồi thành công.</returns>
    [Authorize]
    [HttpDelete("collections/{collectionId:guid}/share")]
    public async Task<ActionResult<ApiResponse<bool>>> RevokeShareLink(Guid collectionId)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _recipeService.RevokeShareLinkAsync(userId, collectionId));
    }

    /// <summary>
    /// Xem thông tin bộ sưu tập công thức thông qua mã liên kết chia sẻ (Public Share Token):
    /// - Cho phép truy cập ở chế độ chỉ đọc (Read-only), không yêu cầu đăng nhập tài khoản.
    /// - Nếu người xem có đăng nhập, hệ thống sẽ tự động cá nhân hóa cờ món ăn yêu thích và hiển thị cảnh báo sức khỏe phù hợp với người xem.
    /// - Trả về mã lỗi 404 Not Found nếu shareToken sai hoặc liên kết đã bị thu hồi bởi chủ sở hữu.
    /// </summary>
    /// <param name="shareToken">Chuỗi mã bí mật dùng để truy cập bộ sưu tập chia sẻ.</param>
    /// <returns>Đối tượng <see cref="RecipeCollectionDto"/> chứa thông tin bộ sưu tập và danh sách món ăn.</returns>
    [AllowAnonymous]
    [HttpGet("collections/shared/{shareToken}")]
    public async Task<ActionResult<ApiResponse<RecipeCollectionDto>>> GetSharedCollection(string shareToken) =>
        this.ToActionResult(await _recipeService.GetSharedCollectionAsync(shareToken, OptionalUserId()));
}
