using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Infrastructure.Options;

/// <summary>Cấu hình các tính năng AI (mục "Ai"). Khóa Gemini nằm ở mục "Gemini" và chỉ đặt qua biến môi trường.</summary>
public sealed class AiOptions
{
    public const string SectionName = "Ai";

    /// <summary>Số lượt AI miễn phí mỗi ngày cho tài khoản Free (BR-233). Tài khoản Pro không giới hạn.</summary>
    [Range(0, 1000)]
    public int FreeDailyLimit { get; set; } = 5;

    /// <summary>Múi giờ (lệch so với UTC, giờ) quyết định lúc hạn mức được làm mới. Mặc định +7 (Việt Nam).</summary>
    [Range(-12, 14)]
    public int QuotaUtcOffsetHours { get; set; } = 7;

    /// <summary>
    /// Cho phép trả dữ liệu MẪU (IsDemo = true) khi chưa cấu hình Gemini hoặc Gemini lỗi. Để trống = chỉ bật ở môi trường
    /// Development để demo; môi trường thật trả lỗi rõ ràng (503/502) thay vì giả vờ thành công.
    /// </summary>
    public bool? AllowDemoFallback { get; set; }

    /// <summary>Dung lượng ảnh tối đa cho một lần phân tích (byte).</summary>
    [Range(1024, 20 * 1024 * 1024)]
    public long MaxImageBytes { get; set; } = 5 * 1024 * 1024;
}
