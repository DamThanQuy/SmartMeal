namespace SmartMeal.Infrastructure.Options;

/// <summary>Nơi lưu file người dùng tải lên (ảnh đại diện...). Mục "Storage" trong cấu hình.</summary>
public sealed class StorageOptions
{
    public const string SectionName = "Storage";

    /// <summary>
    /// Thư mục gốc lưu file. Để trống = thư mục "uploads" cạnh ứng dụng. Chạy trong Docker cần gắn volume vào đây
    /// để file không mất khi container bị tạo lại.
    /// </summary>
    public string? Root { get; set; }

    /// <summary>
    /// Địa chỉ công khai của máy chủ để dựng URL file (vd. https://api.smartmeal.app). Để trống = lấy theo request hiện tại.
    /// </summary>
    public string? PublicBaseUrl { get; set; }

    /// <summary>Dung lượng tối đa của ảnh đại diện (byte).</summary>
    public long MaxAvatarBytes { get; set; } = 2 * 1024 * 1024;
}
