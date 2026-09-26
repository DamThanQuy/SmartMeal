using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.AI;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AiController : ControllerBase
{
    private readonly IAiVisionService _aiVisionService;

    public AiController(IAiVisionService aiVisionService)
    {
        _aiVisionService = aiVisionService;
    }

    /// <summary>
    /// AI Snap & Track: Chụp ảnh đĩa thức ăn -> Nhận diện tên món, ước tính Calo, Carbs, Protein, Fat và cảnh báo dị ứng.
    /// </summary>
    [HttpPost("snap-and-track")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<SnapAndTrackResponseDto>>> SnapAndTrack(IFormFile? image)
    {
        if (image == null || image.Length == 0)
        {
            return BadRequest(ApiResponse<SnapAndTrackResponseDto>.Fail("Vui lòng tải lên file ảnh đĩa thức ăn hợp lệ."));
        }

        Guid? userId = null;
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdStr, out var parsedId))
        {
            userId = parsedId;
        }

        using var memoryStream = new MemoryStream();
        await image.CopyToAsync(memoryStream);
        var imageBytes = memoryStream.ToArray();

        var result = await _aiVisionService.SnapAndTrackAsync(imageBytes, image.ContentType, userId);
        return Ok(result);
    }

    /// <summary>
    /// Fridge Scanner: Chụp ảnh các nguyên liệu trong tủ lạnh -> AI phân tích và đề xuất 2-3 món nấu được ngay.
    /// </summary>
    [HttpPost("fridge-scanner")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<FridgeScannerResponseDto>>> FridgeScanner(IFormFile? image)
    {
        if (image == null || image.Length == 0)
        {
            return BadRequest(ApiResponse<FridgeScannerResponseDto>.Fail("Vui lòng tải lên file ảnh nguyên liệu trong tủ lạnh."));
        }

        using var memoryStream = new MemoryStream();
        await image.CopyToAsync(memoryStream);
        var imageBytes = memoryStream.ToArray();

        var result = await _aiVisionService.ScanFridgeAsync(imageBytes, image.ContentType);
        return Ok(result);
    }

    /// <summary>
    /// Voice Log NLP: Nhận diện câu nói tự nhiên thành dữ liệu bữa ăn kèm dinh dưỡng.
    /// </summary>
    [HttpPost("voice-log")]
    public async Task<ActionResult<ApiResponse<VoiceLogResponseDto>>> VoiceLog([FromBody] VoiceLogRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Transcript))
        {
            return BadRequest(ApiResponse<VoiceLogResponseDto>.Fail("Vui lòng nhập đoạn văn bản giọng nói."));
        }

        var result = await _aiVisionService.ParseVoiceLogAsync(dto.Transcript);
        return Ok(result);
    }

    /// <summary>
    /// OCR & Barcode Safety Check: Phân tích thành phần quét từ bao bì và kiểm tra an toàn theo bệnh lý/dị ứng của User.
    /// </summary>
    [HttpPost("check-safety")]
    public async Task<ActionResult<ApiResponse<CheckSafetyResponseDto>>> CheckSafety([FromBody] CheckSafetyRequestDto dto)
    {
        Guid? userId = null;
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdStr, out var parsedId))
        {
            userId = parsedId;
        }

        var result = await _aiVisionService.CheckSafetyAsync(dto, userId);
        return Ok(result);
    }
}
