namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Quy ước đường dẫn file người dùng tải lên: "{thư mục}/{userId}/{tên do server sinh}.{đuôi}", phục vụ tĩnh tại
/// "/uploads/...". Dùng chung cho ảnh đại diện và ảnh món ăn để lưu, dựng URL và nhận ra file của chính người dùng.
/// </summary>
public static class UploadPaths
{
    public const string Avatars = "avatars";
    public const string MealPhotos = "meals";

    /// <summary>Thư mục chứa mọi file loại <paramref name="folder"/> của một người dùng.</summary>
    public static string UserFolder(string folder, Guid userId) => $"{folder}/{userId:N}";

    /// <summary>Đường dẫn file mới — tên do server sinh (không dùng tên client gửi) để không thể ghi đè hay thoát thư mục.</summary>
    public static string NewFile(string folder, Guid userId, string extension) =>
        $"{UserFolder(folder, userId)}/{Guid.NewGuid():N}.{extension}";

    /// <summary>
    /// Tạo đường dẫn URL công khai để truy cập tệp tĩnh đã tải lên.
    /// </summary>
    /// <param name="publicBaseUrl">Địa chỉ URL gốc của máy chủ.</param>
    /// <param name="relativePath">Đường dẫn tương đối của tệp tĩnh trong thư mục uploads.</param>
    /// <returns>Địa chỉ URL đầy đủ để client truy cập tệp.</returns>
    public static string PublicUrl(string publicBaseUrl, string relativePath) =>
        $"{publicBaseUrl.TrimEnd('/')}/uploads/{relativePath}";

    /// <summary>Nếu <paramref name="url"/> là file do hệ thống lưu cho chính người dùng này thì trả đường dẫn tương đối để xóa.</summary>
    public static string? OwnRelativePath(string? url, string folder, Guid userId)
    {
        if (string.IsNullOrEmpty(url))
        {
            return null;
        }

        var marker = $"/uploads/{UserFolder(folder, userId)}/";
        var index = url.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (index < 0)
        {
            return null;
        }

        var fileName = Path.GetFileName(url[(index + marker.Length)..]);
        return string.IsNullOrEmpty(fileName) ? null : $"{UserFolder(folder, userId)}/{fileName}";
    }
}
