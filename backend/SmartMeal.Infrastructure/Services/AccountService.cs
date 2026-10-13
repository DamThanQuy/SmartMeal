using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

public class AccountService : IAccountService
{
    private readonly ApplicationDbContext _db;
    private readonly IFileStorage _storage;
    private readonly ILoginAttemptTracker _attempts;
    private readonly StorageOptions _storageOptions;

    public AccountService(
        ApplicationDbContext db,
        IFileStorage storage,
        ILoginAttemptTracker attempts,
        IOptions<StorageOptions> storageOptions)
    {
        _db = db;
        _storage = storage;
        _attempts = attempts;
        _storageOptions = storageOptions.Value;
    }

    // ───────────────────────────── Ảnh đại diện ─────────────────────────────

    public async Task<ApiResponse<UserDto>> UploadAvatarAsync(Guid userId, Stream content, long length, string publicBaseUrl)
    {
        var max = _storageOptions.MaxAvatarBytes;
        var tooLarge = $"Ảnh quá lớn, tối đa {max / (1024 * 1024)} MB.";

        if (length <= 0)
        {
            return ApiResponse<UserDto>.Fail("File ảnh trống.");
        }

        if (length > max)
        {
            return ApiResponse<UserDto>.Fail(tooLarge);
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return ApiResponse<UserDto>.Fail("Người dùng không tồn tại.", null, ApiErrorKind.NotFound);
        }

        // Đọc có chặn trên (không tin Content-Length do client khai) rồi kiểm tra loại file bằng chính nội dung.
        var bytes = await ReadBoundedAsync(content, max);
        if (bytes is null)
        {
            return ApiResponse<UserDto>.Fail(tooLarge);
        }

        var extension = DetectImageExtension(bytes);
        if (extension is null)
        {
            return ApiResponse<UserDto>.Fail("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
        }

        // Tên file do server sinh (không dùng tên client gửi) để không thể ghi đè hay thoát thư mục.
        var relativePath = $"avatars/{userId:N}/{Guid.NewGuid():N}.{extension}";
        await _storage.SaveAsync(relativePath, new MemoryStream(bytes));

        var previous = ExtractOwnRelativePath(user.AvatarUrl, userId);
        user.AvatarUrl = $"{publicBaseUrl.TrimEnd('/')}/uploads/{relativePath}";
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        if (previous is not null)
        {
            await _storage.DeleteAsync(previous);
        }

        var hasSurvey = await _db.HealthProfiles.AnyAsync(hp => hp.UserId == userId);
        return ApiResponse<UserDto>.Ok(ToUserDto(user, hasSurvey), "Cập nhật ảnh đại diện thành công.");
    }

    // ───────────────────────────── Xóa dữ liệu / tài khoản ─────────────────────────────

    public async Task<ApiResponse<DeleteDataResultDto>> DeleteMyDataAsync(Guid userId)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        var deleted = await DeletePersonalDataAsync(userId);
        await transaction.CommitAsync();

        return ApiResponse<DeleteDataResultDto>.Ok(
            new DeleteDataResultDto { Deleted = deleted },
            "Đã xóa dữ liệu cá nhân. Lịch sử giao dịch thanh toán được giữ lại theo quy định.");
    }

    public async Task<ApiResponse<bool>> DeleteAccountAsync(Guid userId, DeleteAccountRequestDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return ApiResponse<bool>.Fail("Người dùng không tồn tại.", null, ApiErrorKind.NotFound);
        }

        var now = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(user.PasswordHash))
        {
            if (string.IsNullOrEmpty(dto.Password))
            {
                return ApiResponse<bool>.Fail("Cần nhập mật khẩu để xóa tài khoản.");
            }

            if (_attempts.RemainingLockout(user, now) is { } remaining)
            {
                var minutes = Math.Max(1, (int)Math.Ceiling(remaining.TotalMinutes));
                return ApiResponse<bool>.Fail($"Tài khoản tạm thời bị khóa. Vui lòng thử lại sau {minutes} phút.", null, ApiErrorKind.Locked);
            }

            // 400 (không phải 401): sai mật khẩu ở đây không phải phiên hết hạn.
            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                if (await _attempts.RegisterFailureAsync(user, now) is not null)
                {
                    return ApiResponse<bool>.Fail("Nhập sai mật khẩu quá nhiều lần, tài khoản tạm thời bị khóa.", null, ApiErrorKind.Locked);
                }

                return ApiResponse<bool>.Fail("Mật khẩu không đúng.");
            }
        }
        else if (!string.Equals(dto.ConfirmEmail?.Trim(), user.Email, StringComparison.OrdinalIgnoreCase))
        {
            // Tài khoản chỉ đăng nhập Google không có mật khẩu: bắt nhập lại email của chính mình để xác nhận.
            return ApiResponse<bool>.Fail("Nhập đúng email của tài khoản vào confirmEmail để xác nhận xóa.");
        }

        var avatar = ExtractOwnRelativePath(user.AvatarUrl, userId);

        // Xóa người dùng kéo theo (cascade ở DB) toàn bộ dữ liệu của họ, kể cả refresh token.
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        if (avatar is not null)
        {
            await _storage.DeleteAsync(avatar);
        }

        return ApiResponse<bool>.Ok(true, "Đã xóa tài khoản.");
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    /// <summary>
    /// Xóa các nhóm dữ liệu cá nhân của người dùng (giữ tài khoản và lịch sử thanh toán). Phải gọi trong một transaction.
    /// Mỗi khi thêm tính năng lưu dữ liệu theo người dùng, bổ sung nhóm tương ứng ở đây (BR-271).
    /// </summary>
    private async Task<Dictionary<string, int>> DeletePersonalDataAsync(Guid userId)
    {
        var deleted = new Dictionary<string, int>
        {
            ["diaryItems"] = await _db.DiaryItems.CountAsync(i => i.NutritionDiary.UserId == userId),
            ["weightEntries"] = await _db.WeightHistories.CountAsync(w => w.HealthProfile.UserId == userId)
        };

        // Nhóm bữa ăn kéo theo món; hồ sơ sức khỏe kéo theo cân nặng, dị ứng, bệnh lý, chế độ ăn (cascade ở DB).
        await _db.NutritionDiaries.Where(d => d.UserId == userId).ExecuteDeleteAsync();
        deleted["waterLogs"] = await _db.WaterLogs.Where(w => w.UserId == userId).ExecuteDeleteAsync();
        deleted["healthSyncLogs"] = await _db.HealthSyncLogs.Where(l => l.UserId == userId).ExecuteDeleteAsync();
        deleted["healthProfile"] = await _db.HealthProfiles.Where(hp => hp.UserId == userId).ExecuteDeleteAsync();
        deleted["mealPlans"] = await _db.MealPlans.Where(m => m.UserId == userId).ExecuteDeleteAsync();
        deleted["groceryItems"] = await _db.GroceryItems.Where(g => g.UserId == userId).ExecuteDeleteAsync();
        deleted["favorites"] = await _db.UserFavorites.Where(f => f.UserId == userId).ExecuteDeleteAsync();
        deleted["favoriteFoods"] = await _db.UserFavoriteFoods.Where(f => f.UserId == userId).ExecuteDeleteAsync();
        deleted["customFoods"] = await _db.Ingredients.Where(i => i.OwnerUserId == userId).ExecuteDeleteAsync();
        deleted["collections"] = await _db.RecipeCollections.Where(c => c.UserId == userId).ExecuteDeleteAsync();
        deleted["pet"] = await _db.HealthPets.Where(p => p.UserId == userId).ExecuteDeleteAsync();
        deleted["xpEvents"] = await _db.XpEvents.Where(e => e.UserId == userId).ExecuteDeleteAsync();
        deleted["badges"] = await _db.UserBadges.Where(b => b.UserId == userId).ExecuteDeleteAsync();
        deleted["challenges"] = await _db.UserChallenges.Where(c => c.UserId == userId).ExecuteDeleteAsync();
        deleted["aiUsage"] = await _db.AiUsageLogs.Where(l => l.UserId == userId).ExecuteDeleteAsync();

        return deleted;
    }

    private static async Task<byte[]?> ReadBoundedAsync(Stream content, long max)
    {
        using var buffer = new MemoryStream();
        var chunk = new byte[16 * 1024];
        int read;
        while ((read = await content.ReadAsync(chunk)) > 0)
        {
            buffer.Write(chunk, 0, read);
            if (buffer.Length > max)
            {
                return null;
            }
        }

        return buffer.ToArray();
    }

    /// <summary>Nhận diện JPG/PNG/WebP bằng chữ ký đầu file; trả phần mở rộng chuẩn hoặc null.</summary>
    private static string? DetectImageExtension(byte[] bytes) => ImageSniffer.DetectExtension(bytes);

    /// <summary>Nếu avatar hiện tại là file do chính hệ thống lưu cho người dùng này thì trả đường dẫn tương đối để xóa.</summary>
    private static string? ExtractOwnRelativePath(string? avatarUrl, Guid userId)
    {
        if (string.IsNullOrEmpty(avatarUrl))
        {
            return null;
        }

        var marker = $"/uploads/avatars/{userId:N}/";
        var index = avatarUrl.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (index < 0)
        {
            return null;
        }

        var fileName = Path.GetFileName(avatarUrl[(index + marker.Length)..]);
        return string.IsNullOrEmpty(fileName) ? null : $"avatars/{userId:N}/{fileName}";
    }

    private static UserDto ToUserDto(User user, bool hasCompletedSurvey) => UserMapper.ToDto(user, hasCompletedSurvey);
}
