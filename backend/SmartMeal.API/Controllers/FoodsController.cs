using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Foods;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Controller quản lý cơ sở dữ liệu thực phẩm, nguyên liệu và các món ăn:
/// - Tìm kiếm và lọc danh mục thực phẩm hệ thống và thực phẩm do người dùng đóng góp.
/// - Tra cứu thực phẩm chi tiết theo định danh ID hoặc mã vạch sản phẩm (Barcode EAN/UPC).
/// - Tạo mới, chỉnh sửa, xóa món ăn tùy chỉnh của cá nhân.
/// - Quản lý danh sách thực phẩm yêu thích (Favorites).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class FoodsController : ControllerBase
{
    private readonly IFoodService _foodService;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="FoodsController"/>.
    /// </summary>
    /// <param name="foodService">Dịch vụ xử lý nghiệp vụ danh mục thực phẩm và dinh dưỡng.</param>
    public FoodsController(IFoodService foodService)
    {
        _foodService = foodService;
    }

    /// <summary>
    /// Lấy định danh UserId của người dùng nếu request gửi kèm JWT token hợp lệ;
    /// trả về null khi truy cập dưới dạng ẩn danh (cho phép người dùng chưa đăng nhập vẫn tra cứu được kho thực phẩm chung).
    /// </summary>
    /// <returns>Guid của người dùng hoặc null nếu chưa đăng nhập.</returns>
    private Guid? OptionalUserId() => this.TryGetUserId(out var id) ? id : null;

    /// <summary>
    /// Tìm kiếm và phân trang danh mục thực phẩm (gồm nguyên liệu thô và món ăn chế biến sẵn):
    /// - Hỗ trợ tìm kiếm theo từ khóa (Keyword) không phân biệt hoa thường và không phân biệt dấu tiếng Việt.
    /// - Lọc theo phạm vi (Scope):
    ///   + 'all': Toàn bộ thực phẩm công khai của hệ thống và món riêng của người dùng (mặc định).
    ///   + 'mine': Chỉ các món ăn do chính người dùng tự tạo (yêu cầu đăng nhập).
    ///   + 'recent': Các món người dùng đã ăn hoặc tra cứu gần đây (yêu cầu đăng nhập).
    ///   + 'favorite': Danh sách các món ăn đã được đánh dấu yêu thích (yêu cầu đăng nhập).
    /// </summary>
    /// <param name="query">Đối tượng tham số lọc, sắp xếp và phân trang.</param>
    /// <returns>Danh sách phân trang <see cref="PagedResult{FoodItemDto}"/> các món ăn thỏa mãn tiêu chí.</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<FoodItemDto>>>> GetFoods([FromQuery] FoodQuery query) =>
        this.ToActionResult(await _foodService.GetFoodsAsync(query, OptionalUserId()));

    /// <summary>
    /// Lấy thông tin chi tiết của một món ăn hoặc thực phẩm theo mã định danh duy nhất (FoodId).
    /// Trả về toàn bộ thành phần dinh dưỡng chi tiết (Calories, Protein, Carbs, Fat, Fiber, Natri, v.v.),
    /// kích thước khẩu phần tiêu chuẩn (Serving Size) và thông tin nguồn gốc dữ liệu.
    /// </summary>
    /// <param name="id">Mã định danh duy nhất (GUID) của thực phẩm.</param>
    /// <returns>Đối tượng <see cref="FoodItemDto"/> chứa thông tin dinh dưỡng chi tiết.</returns>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<FoodItemDto>>> GetFoodById(Guid id) =>
        this.ToActionResult(await _foodService.GetFoodByIdAsync(id, OptionalUserId()));

    /// <summary>
    /// Tra cứu thông tin thực phẩm theo mã vạch sản phẩm đóng gói (Barcode chuẩn EAN-8, EAN-13 hoặc UPC-A).
    /// Hệ thống kiểm tra trong kho dữ liệu cục bộ và OpenFoodFacts.
    /// Tuân thủ quy chuẩn BR-120/130: Trả về HTTP 404 Not Found nếu không tìm thấy, tuyệt đối không tự ý đoán số liệu dinh dưỡng.
    /// </summary>
    /// <param name="code">Chuỗi mã vạch từ 8 đến 14 ký tự số.</param>
    /// <returns>Thông tin thực phẩm và bảng thành phần dinh dưỡng chuẩn theo nhãn đóng gói.</returns>
    [HttpGet("barcode/{code}")]
    public async Task<ActionResult<ApiResponse<FoodItemDto>>> GetByBarcode(string code) =>
        this.ToActionResult(await _foodService.GetFoodByBarcodeAsync(code, OptionalUserId()));

    /// <summary>
    /// Người dùng tự nhập một món ăn hoặc nguyên liệu mới vào thư viện cá nhân (BR-120/121):
    /// Món ăn được tạo sẽ gắn cờ 'IsCustom = true' và chỉ hiển thị đối với chính tài khoản tạo ra nó.
    /// Yêu cầu xác thực tài khoản qua Bearer Token.
    /// </summary>
    /// <param name="dto">Dữ liệu món ăn mới gồm tên, khẩu phần, đơn vị tính và các chỉ số dinh dưỡng.</param>
    /// <returns>Thông tin món ăn vừa được tạo thành công kèm ID mới sinh.</returns>
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<FoodItemDto>>> CreateFood([FromBody] CreateFoodRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<FoodItemDto>();
        return this.ToActionResult(await _foodService.CreateFoodAsync(userId, dto));
    }

    /// <summary>
    /// Xóa một món ăn do người dùng tự nhập khỏi thư viện cá nhân:
    /// Chỉ cho phép xóa món ăn do chính người dùng hiện tại tạo ra (chủ sở hữu).
    /// Không cho phép xóa thực phẩm mặc định thuộc cơ sở dữ liệu chung của hệ thống.
    /// </summary>
    /// <param name="id">Mã định danh của món ăn tùy chỉnh cần xóa.</param>
    /// <returns>True nếu xóa thành công.</returns>
    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteFood(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _foodService.DeleteFoodAsync(userId, id));
    }

    /// <summary>
    /// Đánh dấu một món ăn vào danh sách thực phẩm yêu thích (Favorites) của người dùng:
    /// Giúp người dùng dễ dàng tìm kiếm nhanh khi ghi chép nhật ký ăn uống hàng ngày hoặc lập thực đơn.
    /// </summary>
    /// <param name="id">Mã định danh món ăn cần thêm vào yêu thích.</param>
    /// <returns>Đối tượng <see cref="FoodFavoriteDto"/> chứa trạng thái yêu thích mới.</returns>
    [Authorize]
    [HttpPost("{id:guid}/favorite")]
    public async Task<ActionResult<ApiResponse<FoodFavoriteDto>>> AddFavorite(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<FoodFavoriteDto>();
        return this.ToActionResult(await _foodService.SetFavoriteAsync(userId, id, true));
    }

    /// <summary>
    /// Bỏ đánh dấu yêu thích một món ăn khỏi danh sách yêu thích của người dùng.
    /// </summary>
    /// <param name="id">Mã định danh món ăn cần bỏ khỏi danh sách yêu thích.</param>
    /// <returns>Đối tượng <see cref="FoodFavoriteDto"/> chứa trạng thái yêu thích sau khi cập nhật (IsFavorite = false).</returns>
    [Authorize]
    [HttpDelete("{id:guid}/favorite")]
    public async Task<ActionResult<ApiResponse<FoodFavoriteDto>>> RemoveFavorite(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<FoodFavoriteDto>();
        return this.ToActionResult(await _foodService.SetFavoriteAsync(userId, id, false));
    }
}
