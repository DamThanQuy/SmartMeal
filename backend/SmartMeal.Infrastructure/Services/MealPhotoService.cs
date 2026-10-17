using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartMeal.Application.Common;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class MealPhotoService : IMealPhotoService
{
    private readonly ApplicationDbContext _db;
    private readonly IFileStorage _storage;
    private readonly ILogger<MealPhotoService> _logger;

    public MealPhotoService(ApplicationDbContext db, IFileStorage storage, ILogger<MealPhotoService> logger)
    {
        _db = db;
        _storage = storage;
        _logger = logger;
    }

    public async Task<string?> SaveAsync(Guid userId, byte[] imageBytes, string publicBaseUrl)
    {
        var extension = ImageSniffer.DetectExtension(imageBytes);
        if (extension is null)
        {
            return null;
        }

        var relativePath = UploadPaths.NewFile(UploadPaths.MealPhotos, userId, extension);
        try
        {
            await _storage.SaveAsync(relativePath, new MemoryStream(imageBytes));
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            // Kết quả AI vẫn dùng được khi không lưu được ảnh — món chỉ không có ảnh trong nhật ký.
            _logger.LogWarning(ex, "Could not save the meal photo of user {UserId}.", userId);
            return null;
        }

        return UploadPaths.PublicUrl(publicBaseUrl, relativePath);
    }

    public async Task DeleteIfUnusedAsync(Guid userId, string? imageUrl)
    {
        var relativePath = UploadPaths.OwnRelativePath(imageUrl, UploadPaths.MealPhotos, userId);
        if (relativePath is null)
        {
            return;
        }

        var stillUsed = await _db.DiaryItems.AnyAsync(i => i.NutritionDiary.UserId == userId && i.ImageUrl == imageUrl);
        if (!stillUsed)
        {
            await _storage.DeleteAsync(relativePath);
        }
    }
}
