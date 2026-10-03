using System.Text.Json.Serialization;

namespace SmartMeal.Application.Common.Models;

/// <summary>Loại lỗi nghiệp vụ — controller dựa vào đây để chọn HTTP status (không xuất hiện trong JSON).</summary>
public enum ApiErrorKind
{
    BadRequest = 0,
    Unauthorized,
    Forbidden,
    NotFound,
    Conflict,
    Locked,
    TooManyRequests,
    Unavailable
}

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public List<string>? Errors { get; set; }

    /// <summary>Chỉ dùng nội bộ để ánh xạ sang HTTP status; không serialize.</summary>
    [JsonIgnore]
    public ApiErrorKind ErrorKind { get; set; }

    public static ApiResponse<T> Ok(T data, string message = "Thành công") =>
        new() { Success = true, Message = message, Data = data };

    public static ApiResponse<T> Fail(string message, List<string>? errors = null, ApiErrorKind kind = ApiErrorKind.BadRequest) =>
        new() { Success = false, Message = message, Errors = errors, ErrorKind = kind };
}
