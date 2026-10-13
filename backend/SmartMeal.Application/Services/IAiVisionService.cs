using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.AI;

namespace SmartMeal.Application.Services;

public interface IAiVisionService
{
    Task<ApiResponse<SnapAndTrackResponseDto>> SnapAndTrackAsync(byte[] imageBytes, string contentType, Guid? userId = null);
    Task<ApiResponse<FridgeScannerResponseDto>> ScanFridgeAsync(byte[] imageBytes, string contentType);
    Task<ApiResponse<VoiceLogResponseDto>> ParseVoiceLogAsync(string transcript);

    /// <summary>Voice Logging từ file ghi âm: AI chép lời rồi bóc tách món ăn (BR-070).</summary>
    Task<ApiResponse<VoiceLogResponseDto>> ParseVoiceAudioAsync(byte[] audioBytes, string contentType);

    /// <summary>Phân tích văn bản nhãn đã OCR (không nhận mã vạch trần).</summary>
    Task<ApiResponse<CheckSafetyResponseDto>> CheckSafetyAsync(CheckSafetyRequestDto dto, Guid? userId = null);

    /// <summary>Đọc nhãn dinh dưỡng từ ảnh và kiểm tra an toàn (BR-130/140).</summary>
    Task<ApiResponse<CheckSafetyResponseDto>> ScanLabelAsync(byte[] imageBytes, string contentType, Guid? userId = null);
}
