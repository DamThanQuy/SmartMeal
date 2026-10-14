using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
    private readonly IProductSafetyService _productSafety;
    private readonly IAiQuotaService _quota;
    private readonly AiOptions _options;

    public AiController(IAiVisionService aiVisionService, IProductSafetyService productSafety, IAiQuotaService quota, IOptions<AiOptions> options)
    {
        _aiVisionService = aiVisionService;
        _productSafety = productSafety;
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
    /// Voice Log từ file ghi âm (multipart, trường <c>audio</c>; WAV/AAC/M4A/MP3/OGG/WebM, tối đa 10 MB): AI chép lời rồi
    /// bóc tách món ăn. Kết quả có <c>transcript</c> để người dùng đối chiếu; vẫn phải qua bước xác nhận trước khi lưu (BR-054/070).
    /// </summary>
    [HttpPost("voice-log/audio")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<VoiceLogResponseDto>>> VoiceLogAudio(IFormFile? audio)
    {
        var (bytes, mime, error) = await ReadAudioAsync(audio);
        if (error is not null) return BadRequest(ApiResponse<VoiceLogResponseDto>.Fail(error));

        return await RunWithQuotaAsync("voice", _ => _aiVisionService.ParseVoiceAudioAsync(bytes!, mime!));
    }

    /// <summary>
    /// Kiểm tra an toàn sản phẩm theo dị ứng/bệnh lý của người dùng (BR-140). Không tính vào hạn mức miễn phí vì đây là
    /// tính năng an toàn, nhưng vẫn cần đăng nhập. Có <c>barcode</c> thì tra sản phẩm trong CSDL (không dùng AI đoán);
    /// chưa có sản phẩm → 404 <c>product_not_found</c>, trừ khi kèm <c>ocrRawText</c> thì AI phân tích văn bản nhãn.
    /// </summary>
    [HttpPost("check-safety")]
    [EnableRateLimiting(RateLimitPolicies.Scanner)]
    public async Task<ActionResult<ApiResponse<CheckSafetyResponseDto>>> CheckSafety([FromBody] CheckSafetyRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<CheckSafetyResponseDto>();

        if (!string.IsNullOrWhiteSpace(dto.Barcode))
        {
            var byBarcode = await _productSafety.CheckBarcodeAsync(dto.Barcode, userId);
            if (byBarcode.Success || byBarcode.ErrorKind != ApiErrorKind.NotFound || string.IsNullOrWhiteSpace(dto.OcrRawText))
            {
                return this.ToActionResult(byBarcode);
            }
        }

        return this.ToActionResult(await _aiVisionService.CheckSafetyAsync(new CheckSafetyRequestDto { OcrRawText = dto.OcrRawText }, userId));
    }

    /// <summary>
    /// Đọc nhãn dinh dưỡng từ ảnh (multipart, trường <c>image</c>) rồi kiểm tra an toàn (BR-130/140). Kết quả là ước tính
    /// của AI, người dùng phải kiểm tra trước khi lưu. Không tính vào hạn mức miễn phí (tính năng an toàn), có giới hạn tần suất.
    /// </summary>
    [HttpPost("scan-label")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(8 * 1024 * 1024)]
    [EnableRateLimiting(RateLimitPolicies.Scanner)]
    public async Task<ActionResult<ApiResponse<CheckSafetyResponseDto>>> ScanLabel(IFormFile? image)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<CheckSafetyResponseDto>();

        var (bytes, mime, error) = await ReadImageAsync(image);
        if (error is not null) return BadRequest(ApiResponse<CheckSafetyResponseDto>.Fail(error));

        return this.ToActionResult(await _aiVisionService.ScanLabelAsync(bytes!, mime!, userId));
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

    /// <summary>Đọc file ghi âm có giới hạn dung lượng và nhận định dạng bằng nội dung file.</summary>
    private async Task<(byte[]? Bytes, string? Mime, string? Error)> ReadAudioAsync(IFormFile? audio)
    {
        if (audio is null || audio.Length == 0)
        {
            return (null, null, "Vui lòng tải lên file ghi âm hợp lệ (trường multipart tên \"audio\").");
        }

        if (audio.Length > _options.MaxAudioBytes)
        {
            return (null, null, $"File ghi âm quá lớn, tối đa {_options.MaxAudioBytes / (1024 * 1024)} MB.");
        }

        using var buffer = new MemoryStream();
        await using (var stream = audio.OpenReadStream())
        {
            await stream.CopyToAsync(buffer);
        }

        var bytes = buffer.ToArray();
        var mime = AudioSniffer.DetectMimeType(bytes);
        return mime is null
            ? (null, null, "Chỉ hỗ trợ file ghi âm WAV, AAC, M4A, MP3, OGG hoặc WebM.")
            : (bytes, mime, null);
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
