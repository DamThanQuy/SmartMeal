using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.API.Infrastructure;

/// <summary>
/// Hỗ trợ header <c>Idempotency-Key</c> cho POST/PUT/PATCH/DELETE của người dùng đã đăng nhập: request đầu tiên chạy bình
/// thường và phản hồi được lưu 24 giờ; gửi lại cùng khóa + cùng nội dung thì nhận lại đúng phản hồi đó (header
/// <c>Idempotency-Replayed: true</c>) mà không ghi thêm dữ liệu — dùng cho hàng đợi offline của app (BR-261).
/// Cùng khóa nhưng khác nội dung → 409 <c>idempotency_key_reused</c>; request đầu chưa xong → 409 <c>idempotency_in_progress</c>.
/// Lỗi 5xx và lỗi tạm thời (408/409/423/429) không được lưu để lần gửi lại được chạy thật.
/// </summary>
public sealed partial class IdempotencyMiddleware
{
    public const string HeaderName = "Idempotency-Key";
    public const string ReplayedHeader = "Idempotency-Replayed";

    private static readonly TimeSpan Retention = TimeSpan.FromHours(24);
    private static readonly int[] TransientStatuses = { 408, 409, 423, 429 };
    private const int MaxStoredBodyBytes = 1024 * 1024;

    private readonly RequestDelegate _next;

    public IdempotencyMiddleware(RequestDelegate next) => _next = next;

    [GeneratedRegex("^[A-Za-z0-9._:-]{1,100}$")]
    private static partial Regex KeyPattern();

    public async Task InvokeAsync(HttpContext context)
    {
        var request = context.Request;
        var isWrite = HttpMethods.IsPost(request.Method) || HttpMethods.IsPut(request.Method)
            || HttpMethods.IsPatch(request.Method) || HttpMethods.IsDelete(request.Method);
        if (!isWrite
            || !request.Headers.TryGetValue(HeaderName, out var header)
            || string.IsNullOrWhiteSpace(header)
            || !Guid.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            await _next(context);
            return;
        }

        var key = header.ToString().Trim();
        if (!KeyPattern().IsMatch(key))
        {
            await ApiErrorWriter.WriteAsync(context, StatusCodes.Status400BadRequest,
                "Idempotency-Key không hợp lệ (1–100 ký tự gồm chữ, số và - _ . :).", new List<string> { "idempotency_key_invalid" });
            return;
        }

        var hash = await HashRequestAsync(request);
        var db = context.RequestServices.GetRequiredService<ApplicationDbContext>();
        var now = DateTime.UtcNow;
        await db.IdempotencyRecords.Where(r => r.UserId == userId && r.CreatedAt < now - Retention).ExecuteDeleteAsync();

        var claimed = await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "IdempotencyRecords" ("UserId", "Key", "RequestHash", "StatusCode", "CreatedAt")
            VALUES ({userId}, {key}, {hash}, 0, {now})
            ON CONFLICT DO NOTHING
            """);
        if (claimed == 0)
        {
            await ReplayAsync(context, db, userId, key, hash);
            return;
        }

        var originalBody = context.Response.Body;
        using var buffer = new MemoryStream();
        context.Response.Body = buffer;
        try
        {
            await _next(context);
        }
        catch
        {
            context.Response.Body = originalBody;
            await ForgetAsync(db, userId, key);
            throw;
        }

        context.Response.Body = originalBody;
        var status = context.Response.StatusCode;
        var storable = buffer.Length <= MaxStoredBodyBytes
            && ((status >= 200 && status < 300) || (status >= 400 && status < 500 && !TransientStatuses.Contains(status)));
        if (storable)
        {
            var body = Encoding.UTF8.GetString(buffer.GetBuffer(), 0, (int)buffer.Length);
            var contentType = context.Response.ContentType;
            await db.IdempotencyRecords
                .Where(r => r.UserId == userId && r.Key == key)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(r => r.StatusCode, status)
                    .SetProperty(r => r.ResponseBody, body)
                    .SetProperty(r => r.ResponseContentType, contentType));
        }
        else
        {
            await ForgetAsync(db, userId, key);
        }

        buffer.Position = 0;
        await buffer.CopyToAsync(originalBody);
    }

    private static async Task ReplayAsync(HttpContext context, ApplicationDbContext db, Guid userId, string key, string hash)
    {
        var record = await db.IdempotencyRecords.AsNoTracking().FirstOrDefaultAsync(r => r.UserId == userId && r.Key == key);
        if (record is null || record.RequestHash != hash)
        {
            await ApiErrorWriter.WriteAsync(context, StatusCodes.Status409Conflict,
                "Idempotency-Key này đã được dùng cho một request khác.", new List<string> { "idempotency_key_reused" });
            return;
        }

        if (record.StatusCode == 0)
        {
            await ApiErrorWriter.WriteAsync(context, StatusCodes.Status409Conflict,
                "Request với Idempotency-Key này đang được xử lý, vui lòng thử lại sau.", new List<string> { "idempotency_in_progress" });
            return;
        }

        context.Response.StatusCode = record.StatusCode;
        context.Response.Headers[ReplayedHeader] = "true";
        if (!string.IsNullOrEmpty(record.ResponseContentType))
        {
            context.Response.ContentType = record.ResponseContentType;
        }

        await context.Response.WriteAsync(record.ResponseBody ?? string.Empty);
    }

    private static Task ForgetAsync(ApplicationDbContext db, Guid userId, string key) =>
        db.IdempotencyRecords.Where(r => r.UserId == userId && r.Key == key).ExecuteDeleteAsync();

    /// <summary>SHA-256 của method, đường dẫn, query và body (body được đệm lại để controller vẫn đọc được).</summary>
    private static async Task<string> HashRequestAsync(HttpRequest request)
    {
        request.EnableBuffering();
        using var sha = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        sha.AppendData(Encoding.UTF8.GetBytes($"{request.Method} {request.Path}{request.QueryString}\n"));

        var chunk = new byte[16 * 1024];
        int read;
        while ((read = await request.Body.ReadAsync(chunk)) > 0)
        {
            sha.AppendData(chunk, 0, read);
        }

        request.Body.Position = 0;
        return Convert.ToHexString(sha.GetHashAndReset());
    }
}
