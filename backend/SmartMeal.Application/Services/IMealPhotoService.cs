namespace SmartMeal.Application.Services;

/// <summary>
/// Ảnh món ăn người dùng chụp cho AI Snap: lưu lại để gắn vào món trong nhật ký (<c>DiaryItem.ImageUrl</c>) và xem lại
/// về sau. Ảnh nằm trong thư mục riêng của người dùng, bị xóa cùng dữ liệu cá nhân (BR-271).
/// </summary>
public interface IMealPhotoService
{
    /// <summary>Lưu ảnh (đã kiểm tra là JPG/PNG/WebP) và trả URL công khai; null nếu không lưu được.</summary>
    Task<string?> SaveAsync(Guid userId, byte[] imageBytes, string publicBaseUrl);

    /// <summary>Xóa ảnh nếu là ảnh của chính người dùng và không còn món nào trong nhật ký dùng tới.</summary>
    Task DeleteIfUnusedAsync(Guid userId, string? imageUrl);
}
