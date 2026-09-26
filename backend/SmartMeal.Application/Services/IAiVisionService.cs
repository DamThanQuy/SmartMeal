using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.AI;

namespace SmartMeal.Application.Services;

public interface IAiVisionService
{
    Task<ApiResponse<SnapAndTrackResponseDto>> SnapAndTrackAsync(byte[] imageBytes, string contentType, Guid? userId = null);
    Task<ApiResponse<FridgeScannerResponseDto>> ScanFridgeAsync(byte[] imageBytes, string contentType);
    Task<ApiResponse<VoiceLogResponseDto>> ParseVoiceLogAsync(string transcript);
    Task<ApiResponse<CheckSafetyResponseDto>> CheckSafetyAsync(CheckSafetyRequestDto dto, Guid? userId = null);
}
