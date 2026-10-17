using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartMeal.Application.Common;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Dịch vụ quản lý lưu trữ và vòng đời hình ảnh bữa ăn do người dùng tải lên phục vụ tính năng nhận diện món ăn.
/// Tự động phát hiện định dạng ảnh, lưu vào thư mục phân cấp theo UserId và dọn dẹp các ảnh mồ côi không còn gắn với nhật ký.
/// </summary>
public class MealPhotoService : IMealPhotoService
{
    private readonly ApplicationDbContext _db;
    private readonly IFileStorage _storage;
    private readonly ILogger<MealPhotoService> _logger;

    /// <summary>
    /// Khởi tạo dịch vụ lưu trữ ảnh món ăn với DbContext, IFileStorage và ILogger.
    /// </summary>
    /// <param name="db">DbContext truy vấn kiểm tra liên kết của ảnh với bản ghi nhật ký.</param>
    /// <param name="storage">Dịch vụ lưu trữ tệp tin trên hệ thống đĩa.</param>
    /// <param name="logger">Logger ghi nhận cảnh báo nếu xảy ra sự cố lưu trữ.</param>
    public MealPhotoService(ApplicationDbContext db, IFileStorage storage, ILogger<MealPhotoService> logger)
    {
        _db = db;
        _storage = storage;
        _logger = logger;
    }

    /// <summary>
    /// Lưu hình ảnh bữa ăn của người dùng vào bộ lưu trữ tệp tin và trả về đường dẫn URL công khai.
    /// Tự động kiểm tra định dạng ảnh (JPEG, PNG, WEBP), tạo tên tệp ngẫu nhiên theo userId.
    /// </summary>
    /// <param name="userId">Định danh người dùng tải ảnh lên.</param>
    /// <param name="imageBytes">Mảng byte dữ liệu hình ảnh bữa ăn.</param>
    /// <param name="publicBaseUrl">Địa chỉ URL gốc công khai của máy chủ (vd: https://api.smartmeal.com).</param>
    /// <returns>Chuỗi URL truy cập ảnh công khai hoặc null nếu định dạng không hợp lệ hoặc lỗi lưu file.</returns>
    public async Task<string?> SaveAsync(Guid userId, byte[] imageBytes, string publicBaseUrl)
    {
        var extension = ImageSniffer.DetectExtension(imageBytes);
        if (extension is null)
        {
            return null;
        }

        var relativePath = UploadPaths.NewFile(UploadPaths.MealPhotos, userId, extension);
        try
        {
            await _storage.SaveAsync(relativePath, new MemoryStream(imageBytes));
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            // Kết quả AI vẫn dùng được khi không lưu được ảnh — món chỉ không có ảnh trong nhật ký.
            _logger.LogWarning(ex, "Could not save the meal photo of user {UserId}.", userId);
            return null;
        }

        return UploadPaths.PublicUrl(publicBaseUrl, relativePath);
    }

    /// <summary>
    /// Xóa tệp tin ảnh bữa ăn trên đĩa lưu trữ nếu ảnh đó không còn được tham chiếu bởi bất kỳ mục nhật ký dinh dưỡng nào của người dùng.
    /// </summary>
    /// <param name="userId">Định danh người dùng sở hữu ảnh.</param>
    /// <param name="imageUrl">Đường dẫn URL của bức ảnh cần kiểm tra xóa.</param>
    public async Task DeleteIfUnusedAsync(Guid userId, string? imageUrl)
    {
        var relativePath = UploadPaths.OwnRelativePath(imageUrl, UploadPaths.MealPhotos, userId);
        if (relativePath is null)
        {
            return;
        }

        var stillUsed = await _db.DiaryItems.AnyAsync(i => i.NutritionDiary.UserId == userId && i.ImageUrl == imageUrl);
        if (!stillUsed)
        {
            await _storage.DeleteAsync(relativePath);
        }
    }
}
