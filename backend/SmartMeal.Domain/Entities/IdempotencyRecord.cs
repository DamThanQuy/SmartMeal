namespace SmartMeal.Domain.Entities;

/// <summary>
/// Kết quả của một request ghi dữ liệu có header <c>Idempotency-Key</c>: gửi lại cùng khóa (vd. hàng đợi offline đẩy lại
/// sau khi mất mạng) thì trả lại đúng phản hồi cũ thay vì ghi thêm lần nữa. Khóa thuộc về từng người dùng, giữ 24 giờ.
/// </summary>
public class IdempotencyRecord
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Key { get; set; } = string.Empty;

    /// <summary>SHA-256 của method + đường dẫn + query + body, để phát hiện cùng khóa nhưng khác request.</summary>
    public string RequestHash { get; set; } = string.Empty;

    /// <summary>0 = đang xử lý (request đầu tiên chưa xong).</summary>
    public int StatusCode { get; set; }

    public string? ResponseBody { get; set; }
    public string? ResponseContentType { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
