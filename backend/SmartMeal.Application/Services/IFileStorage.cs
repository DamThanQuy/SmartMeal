namespace SmartMeal.Application.Services;

/// <summary>Lưu file người dùng tải lên. Đường dẫn là đường dẫn tương đối dùng dấu "/", vd. "avatars/{userId}/{guid}.png".</summary>
public interface IFileStorage
{
    Task SaveAsync(string relativePath, Stream content, CancellationToken cancellationToken = default);

    /// <summary>Xóa file nếu có; không lỗi khi file không tồn tại.</summary>
    Task DeleteAsync(string relativePath, CancellationToken cancellationToken = default);

    /// <summary>Xóa cả thư mục (và mọi file bên trong) nếu có; không lỗi khi thư mục không tồn tại.</summary>
    Task DeleteDirectoryAsync(string relativePath, CancellationToken cancellationToken = default);
}
