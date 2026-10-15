using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Infrastructure.Options;

/// <summary>
/// Tra mã vạch qua Open Food Facts (mục "OpenFoodFacts") khi CSDL chưa có sản phẩm (BR-120). API công khai, không cần khóa.
/// Sản phẩm tra được lưu lại thành thực phẩm chung "chưa kiểm chứng" nên mỗi mã chỉ gọi ra ngoài một lần.
/// </summary>
public sealed class OpenFoodFactsOptions
{
    public const string SectionName = "OpenFoodFacts";

    /// <summary>Tắt để chỉ dùng CSDL của hệ thống (vd. khi chạy test hoặc máy chủ không ra được Internet).</summary>
    public bool Enabled { get; set; } = true;

    [Required]
    [Url]
    public string BaseUrl { get; set; } = "https://world.openfoodfacts.org";

    /// <summary>Open Food Facts yêu cầu User-Agent nêu tên ứng dụng.</summary>
    [Required]
    public string UserAgent { get; set; } = "SmartMeal/1.0 (PRM393 student project)";

    [Range(1, 30)]
    public int TimeoutSeconds { get; set; } = 8;
}
