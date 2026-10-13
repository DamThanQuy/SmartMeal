using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.AI;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Tính năng AI. Mọi endpoint yêu cầu đăng nhập (để áp hạn mức BR-233, cảnh báo dị ứng theo hồ sơ và không để người lạ
/// dùng hết hạn mức của khóa Gemini). Tài khoản Free có hạn mức lượt/ngày; Pro không giới hạn.
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AiController : ControllerBase
{
    private readonly IAiVisionService _aiVisionService;
    private readonly IAiQuotaService _quota;
    private readonly AiOptions _options;

    public AiController(IAiVisionService aiVisionService, IAiQuotaService quota, IOptions<AiOptions> options)
    {
        _aiVisionService = aiVisionService;
        _quota = quota;
        _options = options.Value;
    }

    /// <summary>Hạn mức AI còn lại hôm nay.</summary>
    [HttpGet("quota")]
    public async Task<ActionResult<ApiResponse<AiQuotaDto>>> GetQuota()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<AiQuotaDto>();

        return Ok(ApiResponse<AiQuotaDto>.Ok(await _quota.GetAsync(userId)));
    }

    /// <summary>AI Snap &amp; Track: ảnh đĩa thức ăn (multipart, trường <c>image</c>; JPG/PNG/WebP, tối đa 5 MB).</summary>
    [HttpPost("snap-and-track")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(8 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<SnapAndTrackResponseDto>>> SnapAndTrack(IFormFile? image)
    {
        var (bytes, mime, error) = await ReadImageAsync(image);
        if (error is not null) return BadRequest(ApiResponse<SnapAndTrackResponseDto>.Fail(error));

        return await RunWithQuotaAsync("snap", userId => _aiVisionService.SnapAndTrackAsync(bytes!, mime!, userId));
    }

    /// <summary>Fridge Scanner: ảnh nguyên liệu trong tủ lạnh (multipart, trường <c>image</c>).</summary>
    [HttpPost("fridge-scanner")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(8 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<FridgeScannerResponseDto>>> FridgeScanner(IFormFile? image)
    {
        var (bytes, mime, error) = await ReadImageAsync(image);
        if (error is not null) return BadRequest(ApiResponse<FridgeScannerResponseDto>.Fail(error));

        return await RunWithQuotaAsync("fridge", _ => _aiVisionService.ScanFridgeAsync(bytes!, mime!));
    }

    /// <summary>Voice Log: văn bản (đã nhận dạng giọng nói trên máy) → món ăn kèm dinh dưỡng.</summary>
    [HttpPost("voice-log")]
    public async Task<ActionResult<ApiResponse<VoiceLogResponseDto>>> VoiceLog([FromBody] VoiceLogRequestDto dto) =>
        await RunWithQuotaAsync("voice", _ => _aiVisionService.ParseVoiceLogAsync(dto.Transcript));

    /// <summary>
    /// Kiểm tra an toàn sản phẩm theo dị ứng/bệnh lý của người dùng (BR-140). Không tính vào hạn mức miễn phí vì đây là
    /// tính năng an toàn, nhưng vẫn cần đăng nhập.
    /// </summary>
    [HttpPost("check-safety")]
    public async Task<ActionResult<ApiResponse<CheckSafetyResponseDto>>> CheckSafety([FromBody] CheckSafetyRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<CheckSafetyResponseDto>();

        return this.ToActionResult(await _aiVisionService.CheckSafetyAsync(dto, userId));
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    /// <summary>Đọc ảnh có giới hạn dung lượng và nhận loại ảnh bằng nội dung (không tin Content-Type do client gửi).</summary>
    private async Task<(byte[]? Bytes, string? Mime, string? Error)> ReadImageAsync(IFormFile? image)
    {
        if (image is null || image.Length == 0)
        {
            return (null, null, "Vui lòng tải lên file ảnh hợp lệ (trường multipart tên \"image\").");
        }

        if (image.Length > _options.MaxImageBytes)
        {
            return (null, null, $"Ảnh quá lớn, tối đa {_options.MaxImageBytes / (1024 * 1024)} MB.");
        }

        using var buffer = new MemoryStream();
        await using (var stream = image.OpenReadStream())
        {
            await stream.CopyToAsync(buffer);
        }

        var bytes = buffer.ToArray();
        var extension = ImageSniffer.DetectExtension(bytes);
        return extension is null
            ? (null, null, "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.")
            : (bytes, ImageSniffer.MimeType(extension), null);
    }

    /// <summary>Kiểm hạn mức (BR-233) trước khi chạy; chỉ ghi nhận lượt dùng khi AI trả kết quả thành công.</summary>
    private async Task<ActionResult<ApiResponse<T>>> RunWithQuotaAsync<T>(string kind, Func<Guid, Task<ApiResponse<T>>> action)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<T>();

        var quota = await _quota.GetAsync(userId);
        if (!quota.IsUnlimited && quota.Remaining <= 0)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, ApiResponse<T>.Fail(
                $"Bạn đã dùng hết {quota.Limit} lượt AI miễn phí hôm nay. Nâng cấp Pro để dùng không giới hạn.",
                new List<string> { "ai_quota_exceeded" },
                ApiErrorKind.TooManyRequests));
        }

        var result = await action(userId);
        if (result.Success)
        {
            await _quota.RecordUseAsync(userId, kind);
        }

        return this.ToActionResult(result);
    }
}
