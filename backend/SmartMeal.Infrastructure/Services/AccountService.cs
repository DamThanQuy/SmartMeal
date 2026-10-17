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

/// <summary>
/// Dịch vụ quản trị tài khoản người dùng và tuân thủ quyền riêng tư dữ liệu (Privacy &amp; Data Rights):
/// - Tải lên ảnh đại diện (Avatar), nhận dạng định dạng file bằng Magic Bytes và xóa bỏ ảnh đại diện cũ trên bộ nhớ.
/// - Xóa bỏ ảnh đại diện (đưa về avatar mặc định).
/// - Xóa sạch dữ liệu hoạt động cá nhân (Delete Personal Data) nhưng vẫn duy trì tài khoản đăng nhập và hóa đơn thanh toán (BR-271).
/// - Xóa vĩnh viễn toàn bộ tài khoản (Delete Account) với cơ chế xác thực mật khẩu hoặc email xác nhận an toàn.
/// </summary>
public class AccountService : IAccountService
{
    private readonly ApplicationDbContext _db;
    private readonly IFileStorage _storage;
    private readonly ILoginAttemptTracker _attempts;
    private readonly StorageOptions _storageOptions;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="AccountService"/>.
    /// </summary>
    /// <param name="db">Database context của ứng dụng.</param>
    /// <param name="storage">Dịch vụ lưu trữ tệp tin (LocalFileStorage hoặc Cloud Storage).</param>
    /// <param name="attempts">Dịch vụ theo dõi và khóa tạm thời tài khoản khi nhập sai mật khẩu xác thực xóa tài khoản.</param>
    /// <param name="storageOptions">Cấu hình dung lượng tệp tin và đường dẫn lưu trữ.</param>
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

    /// <summary>
    /// Tải lên và cập nhật ảnh đại diện cá nhân của người dùng:
    /// - Kiểm tra giới hạn dung lượng luồng Stream so với MaxAvatarBytes.
    /// - Xác thực chữ ký nhị phân (Magic Bytes) để chỉ chấp nhận ảnh định dạng JPG, PNG hoặc WebP.
    /// - Lưu trữ tệp ảnh mới và tự động dọn dẹp (xóa bỏ) tệp ảnh đại diện cũ trước đó để tránh lãng phí dung lượng ổ cứng.
    /// - Cập nhật đường dẫn avatarUrl công khai vào hồ sơ người dùng.
    /// </summary>
    /// <param name="userId">Mã định danh duy nhất của người dùng.</param>
    /// <param name="content">Luồng Stream chứa dữ liệu tệp ảnh tải lên.</param>
    /// <param name="length">Kích thước tệp tin (byte).</param>
    /// <param name="publicBaseUrl">Địa chỉ URL gốc công khai của máy chủ web.</param>
    /// <returns>Hồ sơ người dùng <see cref="UserDto"/> sau khi cập nhật ảnh đại diện mới.</returns>
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

        var relativePath = UploadPaths.NewFile(UploadPaths.Avatars, userId, extension);
        await _storage.SaveAsync(relativePath, new MemoryStream(bytes));

        var previous = UploadPaths.OwnRelativePath(user.AvatarUrl, UploadPaths.Avatars, userId);
        user.AvatarUrl = UploadPaths.PublicUrl(publicBaseUrl, relativePath);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        if (previous is not null)
        {
            await _storage.DeleteAsync(previous);
        }

        var hasSurvey = await _db.HealthProfiles.AnyAsync(hp => hp.UserId == userId);
        return ApiResponse<UserDto>.Ok(ToUserDto(user, hasSurvey), "Cập nhật ảnh đại diện thành công.");
    }

    /// <summary>
    /// Xóa bỏ ảnh đại diện cá nhân của người dùng:
    /// - Đặt lại trường AvatarUrl về null.
    /// - Nếu là tệp ảnh được lưu trữ cục bộ, xóa tệp vật lý khỏi thư mục lưu trữ.
    /// </summary>
    /// <param name="userId">Mã định danh duy nhất của người dùng.</param>
    /// <returns>Hồ sơ người dùng <see cref="UserDto"/> với avatar đã được gỡ bỏ.</returns>
    public async Task<ApiResponse<UserDto>> RemoveAvatarAsync(Guid userId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return ApiResponse<UserDto>.Fail("Người dùng không tồn tại.", null, ApiErrorKind.NotFound);
        }

        // Ảnh Google (URL ngoài) chỉ bỏ liên kết; file do hệ thống lưu thì xóa luôn sau khi đã lưu DB.
        var previous = UploadPaths.OwnRelativePath(user.AvatarUrl, UploadPaths.Avatars, userId);
        if (user.AvatarUrl is not null)
        {
            user.AvatarUrl = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        if (previous is not null)
        {
            await _storage.DeleteAsync(previous);
        }

        var hasSurvey = await _db.HealthProfiles.AnyAsync(hp => hp.UserId == userId);
        return ApiResponse<UserDto>.Ok(ToUserDto(user, hasSurvey), "Đã xóa ảnh đại diện.");
    }

    // ───────────────────────────── Xóa dữ liệu / tài khoản ─────────────────────────────

    /// <summary>
    /// Xóa toàn bộ dữ liệu hoạt động cá nhân của người dùng trong một Transaction nguyên tử:
    /// - Xóa nhật ký ăn uống, nhật ký nước, dữ liệu đồng bộ thể chất, hồ sơ sức khỏe, kế hoạch tuần, danh sách đi chợ, món ăn yêu thích, tiến trình thú cưng và các thông báo.
    /// - Xóa thư mục chứa ảnh chụp món ăn (MealPhotos) trên ổ cứng.
    /// - Giữ nguyên tài khoản và lịch sử thanh toán hóa đơn theo tiêu chuẩn kiểm toán và BR-271.
    /// </summary>
    /// <param name="userId">Mã định danh duy nhất của người dùng.</param>
    /// <returns>Đối tượng <see cref="DeleteDataResultDto"/> chứa số lượng bản ghi đã được xóa ở từng danh mục.</returns>
    public async Task<ApiResponse<DeleteDataResultDto>> DeleteMyDataAsync(Guid userId)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        var deleted = await DeletePersonalDataAsync(userId);
        await transaction.CommitAsync();

        // Ảnh món ăn gắn với nhật ký vừa xóa (giữ ảnh đại diện vì tài khoản vẫn còn).
        await _storage.DeleteDirectoryAsync(UploadPaths.UserFolder(UploadPaths.MealPhotos, userId));

        return ApiResponse<DeleteDataResultDto>.Ok(
            new DeleteDataResultDto { Deleted = deleted },
            "Đã xóa dữ liệu cá nhân. Lịch sử giao dịch thanh toán được giữ lại theo quy định.");
    }

    /// <summary>
    /// Xóa vĩnh viễn tài khoản người dùng khỏi hệ thống:
    /// - Yêu cầu xác nhận quyền sở hữu: Tài khoản thông thường cần cung cấp đúng mật khẩu; tài khoản Google SSO cần nhập lại chính xác email.
    /// - Tích hợp bộ đếm sai mật khẩu: Khóa tài khoản tạm thời nếu nhập sai mật khẩu liên tiếp quá nhiều lần.
    /// - Xóa User thực thể (kéo theo xóa toàn bộ dữ liệu liên quan qua cơ chế Cascade Delete của cơ sở dữ liệu).
    /// - Xóa toàn bộ tệp tin ảnh đại diện và ảnh chụp món ăn trên ổ đĩa.
    /// </summary>
    /// <param name="userId">Mã định danh duy nhất của người dùng cần xóa.</param>
    /// <param name="dto">Dữ liệu xác thực xóa gồm mật khẩu hoặc email xác nhận.</param>
    /// <returns>True nếu xóa tài khoản thành công.</returns>
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
            // Tài khoản không có mật khẩu (tạo bằng đăng nhập Google trước đây): bắt nhập lại email của chính mình để xác nhận.
            return ApiResponse<bool>.Fail("Nhập đúng email của tài khoản vào confirmEmail để xác nhận xóa.");
        }

        var avatar = UploadPaths.OwnRelativePath(user.AvatarUrl, UploadPaths.Avatars, userId);

        // Xóa người dùng kéo theo (cascade ở DB) toàn bộ dữ liệu của họ, kể cả refresh token.
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        if (avatar is not null)
        {
            await _storage.DeleteAsync(avatar);
        }

        await _storage.DeleteDirectoryAsync(UploadPaths.UserFolder(UploadPaths.MealPhotos, userId));

        return ApiResponse<bool>.Ok(true, "Đã xóa tài khoản.");
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    /// <summary>
    /// Thực hiện xóa các bảng dữ liệu cá nhân của người dùng và thống kê số lượng bản ghi bị xóa (BR-271).
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
        deleted["groceryTrips"] = await _db.GroceryTrips.Where(t => t.UserId == userId).ExecuteDeleteAsync();
        await _db.GroceryLists.Where(l => l.UserId == userId).ExecuteDeleteAsync();
        deleted["favorites"] = await _db.UserFavorites.Where(f => f.UserId == userId).ExecuteDeleteAsync();
        deleted["favoriteFoods"] = await _db.UserFavoriteFoods.Where(f => f.UserId == userId).ExecuteDeleteAsync();
        deleted["customFoods"] = await _db.Ingredients.Where(i => i.OwnerUserId == userId).ExecuteDeleteAsync();
        deleted["collections"] = await _db.RecipeCollections.Where(c => c.UserId == userId).ExecuteDeleteAsync();
        deleted["pet"] = await _db.HealthPets.Where(p => p.UserId == userId).ExecuteDeleteAsync();
        deleted["xpEvents"] = await _db.XpEvents.Where(e => e.UserId == userId).ExecuteDeleteAsync();
        deleted["badges"] = await _db.UserBadges.Where(b => b.UserId == userId).ExecuteDeleteAsync();
        deleted["challenges"] = await _db.UserChallenges.Where(c => c.UserId == userId).ExecuteDeleteAsync();
        deleted["aiUsage"] = await _db.AiUsageLogs.Where(l => l.UserId == userId).ExecuteDeleteAsync();
        deleted["notifications"] = await _db.UserNotifications.Where(n => n.UserId == userId).ExecuteDeleteAsync();
        // Phản hồi lưu cho Idempotency-Key có thể chứa dữ liệu cá nhân (món đã ghi...) — xóa luôn.
        await _db.IdempotencyRecords.Where(r => r.UserId == userId).ExecuteDeleteAsync();

        return deleted;
    }

    /// <summary>
    /// Đọc dữ liệu từ luồng Stream có kiểm soát chặn trên giới hạn kích thước tối đa (max):
    /// Trả về null nếu luồng vượt quá kích thước cho phép.
    /// </summary>
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

    /// <summary>Nhận diện định dạng JPG/PNG/WebP bằng chữ ký đầu file (Magic Bytes); trả phần mở rộng chuẩn hoặc null.</summary>
    private static string? DetectImageExtension(byte[] bytes) => ImageSniffer.DetectExtension(bytes);

    /// <summary>Chuyển đổi thực thể User sang DTO UserDto.</summary>
    private static UserDto ToUserDto(User user, bool hasCompletedSurvey) => UserMapper.ToDto(user, hasCompletedSurvey);
}
