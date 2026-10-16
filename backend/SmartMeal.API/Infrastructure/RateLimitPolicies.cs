namespace SmartMeal.API.Infrastructure;

/// <summary>Tên các chính sách giới hạn tần suất (cấu hình ở Program.cs).</summary>
public static class RateLimitPolicies
{
    /// <summary>Đăng ký/đăng nhập/làm mới token/OTP: giới hạn theo IP để chống dò mật khẩu và spam.</summary>
    public const string Auth = "auth";

    /// <summary>Kiểm tra an toàn/đọc nhãn: không tính hạn mức AI nên giới hạn tần suất theo người dùng để tránh lạm dụng.</summary>
    public const string Scanner = "scanner";

    /// <summary>Phụ đề tạm khi ghi âm: app gửi lại đoạn ghi âm vài giây một lần, không tính hạn mức AI nên giới hạn theo người dùng.</summary>
    public const string VoiceTranscribe = "voice-transcribe";
}
