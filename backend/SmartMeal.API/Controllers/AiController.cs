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
/// Controller điều phối toàn bộ các tính năng AI thông minh tích hợp Google Gemini:
/// - Snap &amp; Track: Nhận diện món ăn, thành phần dinh dưỡng và kích thước khẩu phần từ ảnh đĩa ăn.
/// - Fridge Scanner: Quét nguyên liệu trong tủ lạnh và gợi ý công thức nấu ăn khả thi (Tính năng Premium).
/// - Voice Log: Chuyển đổi giọng nói thành nhật ký ăn uống tự động từ văn bản hoặc file ghi âm.
/// - Product Safety &amp; Scan Label: Kiểm tra cảnh báo dị ứng và tương thích bệnh lý từ mã vạch hoặc nhãn dinh dưỡng OCR.
/// - Quản lý và kiểm soát hạn mức (Quota) sử dụng AI theo từng cấp độ tài khoản (Free vs Pro).
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AiController : ControllerBase
{
    private readonly IAiVisionService _aiVisionService;
    private readonly IProductSafetyService _productSafety;
    private readonly IAiQuotaService _quota;
    private readonly IMealPhotoService _mealPhotos;
    private readonly AiOptions _options;
    private readonly StorageOptions _storage;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="AiController"/>.
    /// </summary>
    /// <param name="aiVisionService">Dịch vụ thị giác máy tính và xử lý ngôn ngữ tự nhiên Gemini AI.</param>
    /// <param name="productSafety">Dịch vụ kiểm tra mức độ an toàn của sản phẩm dựa trên dị ứng và bệnh lý người dùng.</param>
    /// <param name="quota">Dịch vụ quản lý và theo dõi hạn mức gọi AI trong ngày của người dùng.</param>
    /// <param name="mealPhotos">Dịch vụ lưu trữ ảnh chụp món ăn.</param>
    /// <param name="options">Tùy chọn cấu hình hệ thống AI (giới hạn dung lượng ảnh, âm thanh, v.v.).</param>
    /// <param name="storage">Cấu hình lưu trữ tệp tin (StorageOptions).</param>
    public AiController(
        IAiVisionService aiVisionService,
        IProductSafetyService productSafety,
        IAiQuotaService quota,
        IMealPhotoService mealPhotos,
        IOptions<AiOptions> options,
        IOptions<StorageOptions> storage)
    {
        _aiVisionService = aiVisionService;
        _productSafety = productSafety;
        _quota = quota;
        _mealPhotos = mealPhotos;
        _options = options.Value;
        _storage = storage.Value;
    }

    /// <summary>
    /// Lấy thông tin hạn mức sử dụng tính năng AI trong ngày của người dùng hiện tại (BR-233).
    /// Đối với tài khoản Free: hiển thị tổng số lượt được dùng, số lượt đã dùng và số lượt còn lại hôm nay.
    /// Đối với tài khoản Pro: cờ 'IsUnlimited' bằng true, không giới hạn số lượt sử dụng.
    /// </summary>
    /// <returns>Đối tượng <see cref="AiQuotaDto"/> chứa chi tiết hạn mức AI.</returns>
    [HttpGet("quota")]
    public async Task<ActionResult<ApiResponse<AiQuotaDto>>> GetQuota()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<AiQuotaDto>();

        return Ok(ApiResponse<AiQuotaDto>.Ok(await _quota.GetAsync(userId)));
    }

    /// <summary>
    /// Tính năng AI Snap &amp; Track (Chụp ảnh đĩa thức ăn):
    /// Nhận diện các món ăn có trên đĩa, ước lượng trọng lượng (gram), hàm lượng Calo và các chỉ số đa lượng (Carbs, Protein, Fat).
    /// Hỗ trợ tải lên ảnh dạng multipart (trường 'image'; định dạng JPG/PNG/WebP, dung lượng tối đa cấu hình trong hệ thống).
    /// Áp dụng trừ 1 lượt hạn mức AI sau khi Gemini phân tích thành công.
    /// </summary>
    /// <param name="image">File ảnh đĩa thức ăn chụp từ camera hoặc thư viện thiết bị.</param>
    /// <returns>Đối tượng <see cref="SnapAndTrackResponseDto"/> chứa danh sách món ăn và phân tích dinh dưỡng kèm độ tin cậy.</returns>
    [HttpPost("snap-and-track")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(8 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<SnapAndTrackResponseDto>>> SnapAndTrack(IFormFile? image)
    {
        var (bytes, mime, error) = await ReadImageAsync(image);
        if (error is not null) return BadRequest(ApiResponse<SnapAndTrackResponseDto>.Fail(error));

        return await RunWithQuotaAsync("snap", async userId =>
        {
            var result = await _aiVisionService.SnapAndTrackAsync(bytes!, mime!, userId);
            if (result.Success && result.Data is { } data)
            {
                data.ImageUrl = await _mealPhotos.SaveAsync(userId, bytes!, this.PublicBaseUrl(_storage));
            }

            return result;
        });
    }

    /// <summary>
    /// Tính năng Fridge Scanner - Quét tủ lạnh gợi ý món ăn (Đặc quyền gói Pro, BR-080/230):
    /// Nhận diện các loại rau củ, thực phẩm, gia vị hiện có trong tủ lạnh qua ảnh chụp (trường 'image').
    /// Từ các nguyên liệu phát hiện được, AI đề xuất các công thức nấu ăn phù hợp nhất nhằm tối ưu nguyên liệu sẵn có.
    /// Tài khoản Free khi gọi endpoint này sẽ nhận mã lỗi 403 Forbidden (pro_required).
    /// </summary>
    /// <param name="image">File ảnh chụp thực phẩm trong tủ lạnh.</param>
    /// <returns>Đối tượng <see cref="FridgeScannerResponseDto"/> chứa nguyên liệu tìm thấy và gợi ý món ăn tương ứng.</returns>
    [HttpPost("fridge-scanner")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(8 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<FridgeScannerResponseDto>>> FridgeScanner(IFormFile? image)
    {
        var (bytes, mime, error) = await ReadImageAsync(image);
        if (error is not null) return BadRequest(ApiResponse<FridgeScannerResponseDto>.Fail(error));

        return await RunWithQuotaAsync("fridge", _ => _aiVisionService.ScanFridgeAsync(bytes!, mime!), requiresPro: true);
    }

    /// <summary>
    /// Tính năng Voice Log qua văn bản:
    /// Tiếp nhận chuỗi văn bản đã được thiết bị nhận dạng giọng nói (Speech-to-Text),
    /// sử dụng AI để bóc tách thành danh sách các món ăn, số lượng, khối lượng và tự động tra cứu giá trị dinh dưỡng tương ứng.
    /// </summary>
    /// <param name="dto">Dữ liệu chứa chuỗi văn bản người dùng nói (Transcript).</param>
    /// <returns>Đối tượng <see cref="VoiceLogResponseDto"/> chứa danh sách món ăn bóc tách được để người dùng xác nhận.</returns>
    [HttpPost("voice-log")]
    public async Task<ActionResult<ApiResponse<VoiceLogResponseDto>>> VoiceLog([FromBody] VoiceLogRequestDto dto) =>
        await RunWithQuotaAsync("voice", _ => _aiVisionService.ParseVoiceLogAsync(dto.Transcript));

    /// <summary>
    /// Tính năng Voice Log trực tiếp từ file ghi âm âm thanh:
    /// Tiếp nhận tệp âm thanh (multipart, trường 'audio'; hỗ trợ WAV, AAC, M4A, MP3, OGG, WebM, tối đa 10MB).
    /// AI Gemini thực hiện đồng thời: chuyển giọng nói thành văn bản (Transcription) và trích xuất món ăn kèm thành phần dinh dưỡng.
    /// Luôn trả về chuỗi văn bản gốc để người dùng đối chiếu trước khi lưu vào nhật ký ăn uống (BR-054/070).
    /// </summary>
    /// <param name="audio">Tệp tin âm thanh ghi âm lời nói người dùng.</param>
    /// <returns>Đối tượng <see cref="VoiceLogResponseDto"/> gồm lời thoại gốc và danh sách món ăn phân tích được.</returns>
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
    /// Phụ đề tạm khi đang ghi âm (multipart, trường <c>audio</c>): app gửi lại đoạn đã ghi vài giây một lần và hiện bản chép
    /// lời dưới nút micro. Chỉ chép lời, không bóc món; không trừ lượt AI (lượt được tính ở <c>voice-log/audio</c> khi người
    /// dùng nói xong) nhưng hết lượt thì cũng không dùng được, và có giới hạn tần suất theo người dùng.
    /// </summary>
    /// <param name="audio">Đoạn ghi âm tính từ lúc bắt đầu nói đến hiện tại.</param>
    /// <returns>Đối tượng <see cref="VoiceTranscriptDto"/> chứa bản chép lời tạm thời.</returns>
    [HttpPost("voice-log/transcribe")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    [EnableRateLimiting(RateLimitPolicies.VoiceTranscribe)]
    public async Task<ActionResult<ApiResponse<VoiceTranscriptDto>>> VoiceTranscribe(IFormFile? audio)
    {
        var (bytes, mime, error) = await ReadAudioAsync(audio);
        if (error is not null) return BadRequest(ApiResponse<VoiceTranscriptDto>.Fail(error));

        return await RunWithQuotaAsync("voice", _ => _aiVisionService.TranscribeAudioAsync(bytes!, mime!), countsAsUse: false);
    }

    /// <summary>
    /// Kiểm tra mức độ an toàn của sản phẩm thực phẩm đối với sức khỏe người dùng (BR-140):
    /// - Nếu cung cấp mã vạch ('barcode'): Hệ thống tra cứu trực tiếp trong cơ sở dữ liệu nội bộ và OpenFoodFacts (chính xác tuyệt đối).
    /// - Nếu không tìm thấy mã vạch trong CSDL nhưng có kèm văn bản OCR ('ocrRawText'): AI phân tích thành phần nhãn để phát hiện chất gây dị ứng hoặc chất chống chỉ định với bệnh lý người dùng.
    /// Lưu ý: Đây là tính năng bảo vệ sức khỏe an toàn nên không tính trừ vào hạn mức AI Free của người dùng.
    /// </summary>
    /// <param name="dto">Dữ liệu yêu cầu gồm mã vạch (Barcode) hoặc chuỗi OCR quét từ nhãn sản phẩm.</param>
    /// <returns>Đối tượng <see cref="CheckSafetyResponseDto"/> phân loại an toàn (Safe/Caution/Danger) kèm danh sách cảnh báo chi tiết.</returns>
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
    /// Quét ảnh nhãn dinh dưỡng (Nutrition Facts / Ingredients) từ camera và kiểm tra an toàn sức khỏe (BR-130/140):
    /// Tiếp nhận ảnh nhãn sản phẩm (multipart, trường 'image'), dùng AI đọc chữ (OCR), bóc tách thành phần dinh dưỡng
    /// và đối chiếu với hồ sơ dị ứng, bệnh lý của tài khoản.
    /// Không tính phí hạn mức AI lượt dùng, áp dụng Rate Limiting để bảo vệ tài nguyên hệ thống.
    /// </summary>
    /// <param name="image">Tệp ảnh chụp nhãn sản phẩm thực phẩm.</param>
    /// <returns>Đối tượng <see cref="CheckSafetyResponseDto"/> chứa chỉ số dinh dưỡng bóc tách được và kết luận an toàn.</returns>
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

    /// <summary>
    /// Phương thức hỗ trợ đọc và xác thực dữ liệu ảnh tải lên từ form:
    /// Kiểm tra kích thước tệp tin so với cấu hình MaxImageBytes và nhận dạng định dạng thực tế của file (Magic Bytes)
    /// để ngăn chặn giả mạo Content-Type từ phía client.
    /// </summary>
    /// <param name="image">Đối tượng file tải lên từ request.</param>
    /// <returns>Tuple chứa mảng byte dữ liệu, chuỗi mime-type và thông báo lỗi (nếu có).</returns>
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

    /// <summary>
    /// Phương thức hỗ trợ đọc và xác thực file ghi âm âm thanh tải lên:
    /// Kiểm tra kích thước file so với giới hạn MaxAudioBytes và nhận diện mime-type thông qua magic bytes của file âm thanh.
    /// </summary>
    /// <param name="audio">Đối tượng file âm thanh tải lên từ request.</param>
    /// <returns>Tuple chứa mảng byte dữ liệu, chuỗi mime-type và thông báo lỗi (nếu có).</returns>
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

    /// <summary>
    /// Bộ điều phối thực thi nghiệp vụ AI có kiểm soát hạn mức (Quota Guard):
    /// - Kiểm tra quyền hạn tài khoản (chặn 403 nếu tính năng yêu cầu Pro mà tài khoản là Free).
    /// - Kiểm tra số lượt còn lại trong ngày (chặn 429 nếu đã hết hạn mức Free).
    /// - Chỉ ghi nhận trừ lượt dùng thực tế khi AI xử lý thành công (result.Success == true).
    /// </summary>
    /// <typeparam name="T">Kiểu dữ liệu kết quả trả về của tác vụ AI.</typeparam>
    /// <param name="kind">Mã phân loại tính năng AI (ví dụ: 'snap', 'fridge', 'voice') dùng để thống kê.</param>
    /// <param name="action">Hàm delegate thực thi tác vụ AI.</param>
    /// <param name="requiresPro">Cờ chỉ định tính năng có bắt buộc phải nâng cấp tài khoản Pro hay không.</param>
    /// <param name="countsAsUse">Cờ chỉ định có tính lượt sử dụng hay không.</param>
    /// <returns>ActionResult chứa phản hồi kết quả nghiệp vụ.</returns>
    private async Task<ActionResult<ApiResponse<T>>> RunWithQuotaAsync<T>(string kind, Func<Guid, Task<ApiResponse<T>>> action, bool requiresPro = false, bool countsAsUse = true)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<T>();

        // Hạn mức không giới hạn đúng khi tài khoản đang có Pro còn hiệu lực.
        var quota = await _quota.GetAsync(userId);
        if (requiresPro && !quota.IsUnlimited)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<T>.Fail(
                ProRequired.Message, new List<string> { ProRequired.Code }, ApiErrorKind.Forbidden));
        }

        if (!quota.IsUnlimited && quota.Remaining <= 0)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, ApiResponse<T>.Fail(
                $"Bạn đã dùng hết {quota.Limit} lượt AI miễn phí hôm nay. Nâng cấp Pro để dùng không giới hạn.",
                new List<string> { "ai_quota_exceeded" },
                ApiErrorKind.TooManyRequests));
        }

        var result = await action(userId);
        if (result.Success && countsAsUse)
        {
            await _quota.RecordUseAsync(userId, kind);
        }

        return this.ToActionResult(result);
    }
}
