using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

public sealed record DeleteDataPayload(Dictionary<string, int> Deleted);

/// <summary>P1-BE-14 (ảnh đại diện) và P1-BE-10 (xóa dữ liệu / tài khoản, BR-271).</summary>
public class AccountTests : IClassFixture<ApiFactory>
{
    // 1x1 PNG hợp lệ.
    private static readonly byte[] Png = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");

    private static readonly byte[] Jpeg = { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0xFF, 0xD9 };

    private static readonly byte[] Webp =
        "RIFF"u8.ToArray().Concat(new byte[] { 0x1A, 0, 0, 0 }).Concat("WEBPVP8 "u8.ToArray()).Concat(new byte[16]).ToArray();

    private readonly ApiFactory _factory;

    public AccountTests(ApiFactory factory) => _factory = factory;

    private static MultipartFormDataContent FileContent(byte[] bytes, string fileName, string contentType, string field = "file")
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        return new MultipartFormDataContent { { file, field, fileName } };
    }

    private static Task<HttpResponseMessage> UploadAsync(HttpClient client, byte[] bytes, string fileName = "me.png", string contentType = "image/png") =>
        client.PostAsync("/api/auth/avatar", FileContent(bytes, fileName, contentType));

    private static async Task WithDbAsync(ApiFactory factory, Func<ApplicationDbContext, Task> action)
    {
        using var scope = factory.Services.CreateScope();
        await action(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>());
    }

    // ───────────────────────────── Ảnh đại diện ─────────────────────────────

    [DbFact]
    public async Task Uploading_a_valid_image_updates_the_avatar_and_the_file_is_served_with_nosniff()
    {
        var user = await _factory.RegisterUserAsync();

        var response = await UploadAsync(user.Client, Png);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.ReadEnvelopeAsync<UserPayload>()).Data!;
        Assert.NotNull(updated.AvatarUrl);
        Assert.Contains($"/uploads/avatars/{user.Id:N}/", updated.AvatarUrl);
        Assert.EndsWith(".png", updated.AvatarUrl);

        var file = await _factory.CreateClient().GetAsync(new Uri(updated.AvatarUrl!).PathAndQuery);
        Assert.Equal(HttpStatusCode.OK, file.StatusCode);
        Assert.Equal("image/png", file.Content.Headers.ContentType?.MediaType);
        Assert.Equal("nosniff", file.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal(Png, await file.Content.ReadAsByteArrayAsync());

        // /auth/me phản ánh avatar mới.
        var me = (await (await user.Client.GetAsync("/api/auth/me")).ReadEnvelopeAsync<UserPayload>()).Data!;
        Assert.Equal(updated.AvatarUrl, me.AvatarUrl);
    }

    [DbFact]
    public async Task The_file_type_is_decided_by_content_not_by_the_name_or_content_type_the_client_sends()
    {
        var user = await _factory.RegisterUserAsync();

        var jpeg = await UploadAsync(user.Client, Jpeg, fileName: "photo.exe", contentType: "application/octet-stream");
        var webp = await UploadAsync(user.Client, Webp, fileName: "x.png", contentType: "image/png");
        var script = await UploadAsync(user.Client, "<script>alert(1)</script>"u8.ToArray(), fileName: "evil.png", contentType: "image/png");
        var html = await UploadAsync(user.Client, "<html></html>"u8.ToArray(), fileName: "a.jpg", contentType: "image/jpeg");

        Assert.EndsWith(".jpg", (await jpeg.ReadEnvelopeAsync<UserPayload>()).Data!.AvatarUrl);
        Assert.EndsWith(".webp", (await webp.ReadEnvelopeAsync<UserPayload>()).Data!.AvatarUrl);
        Assert.Equal(HttpStatusCode.BadRequest, script.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, html.StatusCode);
        Assert.Contains("JPG, PNG hoặc WebP", (await script.ReadEnvelopeAsync<object>()).Message);
    }

    [DbFact]
    public async Task An_oversized_empty_or_missing_file_is_rejected()
    {
        var user = await _factory.RegisterUserAsync();
        var big = new byte[3 * 1024 * 1024];
        Array.Copy(Png, big, Png.Length);

        var tooLarge = await UploadAsync(user.Client, big);
        var empty = await UploadAsync(user.Client, Array.Empty<byte>());
        var wrongField = await user.Client.PostAsync("/api/auth/avatar", FileContent(Png, "me.png", "image/png", field: "picture"));

        Assert.Equal(HttpStatusCode.BadRequest, tooLarge.StatusCode);
        Assert.Contains("tối đa 2 MB", (await tooLarge.ReadEnvelopeAsync<object>()).Message);
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, wrongField.StatusCode);
    }

    [DbFact]
    public async Task A_file_above_the_hard_request_limit_is_rejected_by_the_server()
    {
        var user = await _factory.RegisterUserAsync();
        var huge = new byte[5 * 1024 * 1024];
        Array.Copy(Png, huge, Png.Length);

        var response = await UploadAsync(user.Client, huge);

        Assert.True(response.StatusCode is HttpStatusCode.RequestEntityTooLarge or HttpStatusCode.BadRequest);
        Assert.False((await response.ReadEnvelopeAsync<object>()).Success);
    }

    [DbFact]
    public async Task Replacing_the_avatar_removes_the_previous_file()
    {
        var user = await _factory.RegisterUserAsync();
        var first = (await (await UploadAsync(user.Client, Png)).ReadEnvelopeAsync<UserPayload>()).Data!.AvatarUrl!;
        var second = (await (await UploadAsync(user.Client, Jpeg, "b.jpg", "image/jpeg")).ReadEnvelopeAsync<UserPayload>()).Data!.AvatarUrl!;

        Assert.NotEqual(first, second);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync(new Uri(first).PathAndQuery)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().GetAsync(new Uri(second).PathAndQuery)).StatusCode);
    }

    [DbFact]
    public async Task Avatar_upload_requires_authentication()
    {
        var response = await UploadAsync(_factory.CreateClient(), Png);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ───────────────────────────── Xóa dữ liệu cá nhân (BR-271) ─────────────────────────────

    private static async Task SeedPersonalDataAsync(HttpClient client)
    {
        (await client.PostJsonAsync("/api/healthprofile/survey", new
        {
            gender = "Male", age = 30, heightCm = 175, currentWeightKg = 70, targetWeightKg = 65, activityLevel = "Moderate",
            goal = "LoseWeight", allergyIds = new[] { 1 }, medicalConditionIds = new int[0], dietaryPreferenceIds = new[] { 2 }
        })).EnsureSuccessStatusCode();
        (await client.PostJsonAsync("/api/nutritiondiary/log", new
        {
            logDate = "2026-09-01", mealType = "Lunch", foodName = "Cơm", servingSize = 100, unit = "g", calories = 130,
            carbsGrams = 28, fatGrams = 0, proteinGrams = 3, logMethod = "Manual"
        })).EnsureSuccessStatusCode();
        (await client.PostJsonAsync("/api/nutritiondiary/water", new { amountMl = 250, date = "2026-09-01" })).EnsureSuccessStatusCode();
        (await client.PostJsonAsync("/api/health-sync/steps-and-calories", new { date = "2026-09-01", source = "Manual", steps = 1000, burnedCalories = 50 })).EnsureSuccessStatusCode();
        (await client.PostJsonAsync("/api/recipes/collections", new { name = "Bộ sưu tập của tôi", isPublic = false })).EnsureSuccessStatusCode();
        (await client.GetAsync("/api/gamification/pet")).EnsureSuccessStatusCode();
    }

    [DbFact]
    public async Task Delete_my_data_removes_personal_data_but_keeps_the_account_and_other_users_data()
    {
        var user = await _factory.RegisterUserAsync();
        var bystander = await _factory.RegisterUserAsync();
        await SeedPersonalDataAsync(user.Client);
        await SeedPersonalDataAsync(bystander.Client);

        var response = await user.Client.DeleteAsync("/api/me/data");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var deleted = (await response.ReadEnvelopeAsync<DeleteDataPayload>()).Data!.Deleted;
        Assert.Equal(1, deleted["diaryItems"]);
        Assert.Equal(1, deleted["waterLogs"]);
        Assert.Equal(1, deleted["healthProfile"]);
        Assert.Equal(1, deleted["weightEntries"]);
        Assert.Equal(1, deleted["healthSyncLogs"]);
        Assert.Equal(1, deleted["collections"]);
        Assert.Equal(1, deleted["pet"]);

        // Dữ liệu của người dùng đã biến mất...
        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.GetAsync("/api/healthprofile")).StatusCode);
        var daily = (await (await user.Client.GetAsync("/api/nutritiondiary/daily?date=2026-09-01")).ReadEnvelopeAsync<DailyPayload>()).Data!;
        Assert.Equal(0, daily.TotalCalories);
        var water = (await (await user.Client.GetAsync("/api/nutritiondiary/water?date=2026-09-01")).ReadEnvelopeAsync<WaterHistoryPayload>()).Data!;
        Assert.Equal(0, water.Days.Single().TotalMl);

        // ...nhưng tài khoản vẫn đăng nhập được và về trạng thái chưa khảo sát.
        var login = await _factory.CreateClient().PostJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        Assert.False((await login.ReadEnvelopeAsync<AuthPayload>()).Data!.User.HasCompletedSurvey);

        // Dữ liệu của người khác không bị ảnh hưởng.
        Assert.Equal(HttpStatusCode.OK, (await bystander.Client.GetAsync("/api/healthprofile")).StatusCode);
        Assert.Equal(130, (await (await bystander.Client.GetAsync("/api/nutritiondiary/daily?date=2026-09-01")).ReadEnvelopeAsync<DailyPayload>()).Data!.TotalCalories);
    }

    [DbFact]
    public async Task Delete_my_data_requires_authentication()
    {
        var response = await _factory.CreateClient().DeleteAsync("/api/me/data");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ───────────────────────────── Xóa tài khoản ─────────────────────────────

    private static Task<HttpResponseMessage> DeleteAccountAsync(HttpClient client, object? body) =>
        client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/auth/account") { Content = JsonContent.Create(body, options: ApiTestHelpers.Json) });

    [DbFact]
    public async Task Delete_account_needs_the_right_password_then_removes_everything_and_the_old_token_stops_working()
    {
        var user = await _factory.RegisterUserAsync();
        await SeedPersonalDataAsync(user.Client);
        (await UploadAsync(user.Client, Png)).EnsureSuccessStatusCode();

        var missing = await DeleteAccountAsync(user.Client, new { });
        var wrong = await DeleteAccountAsync(user.Client, new { password = "not-my-password" });
        Assert.Equal(HttpStatusCode.BadRequest, missing.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);       // 400, không phải 401
        Assert.Equal(HttpStatusCode.OK, (await user.Client.GetAsync("/api/auth/me")).StatusCode);

        var ok = await DeleteAccountAsync(user.Client, new { password = user.Password });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        // Không còn dòng nào gắn với người dùng này.
        await WithDbAsync(_factory, async db =>
        {
            Assert.False(await db.Users.AnyAsync(u => u.Id == user.Id));
            Assert.False(await db.HealthProfiles.AnyAsync(hp => hp.UserId == user.Id));
            Assert.False(await db.NutritionDiaries.AnyAsync(d => d.UserId == user.Id));
            Assert.False(await db.WaterLogs.AnyAsync(w => w.UserId == user.Id));
            Assert.False(await db.HealthSyncLogs.AnyAsync(l => l.UserId == user.Id));
            Assert.False(await db.RecipeCollections.AnyAsync(c => c.UserId == user.Id));
            Assert.False(await db.HealthPets.AnyAsync(p => p.UserId == user.Id));
            Assert.False(await db.RefreshTokens.AnyAsync(t => t.UserId == user.Id));
            Assert.Equal(0, await db.DiaryItems.CountAsync(i => i.NutritionDiary.UserId == user.Id));
        });

        // Access token cũ (còn hạn) không dùng được nữa; refresh token và mật khẩu cũng vậy.
        Assert.Equal(HttpStatusCode.Unauthorized, (await user.Client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().PostJsonAsync("/api/auth/refresh", new { refreshToken = user.RefreshToken })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().PostJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password })).StatusCode);

        // File ảnh đại diện cũng bị xóa khỏi ổ đĩa.
        var avatarFolder = Path.Combine(_factory.UploadsRoot, "avatars", user.Id.ToString("N"));
        Assert.True(!Directory.Exists(avatarFolder) || Directory.GetFiles(avatarFolder).Length == 0);

        // Email dùng lại để đăng ký mới được.
        var again = await _factory.CreateClient().PostJsonAsync("/api/auth/register", new { email = user.Email, password = "Passw0rd!", fullName = "Quay lại" });
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
    }

    [DbFact]
    public async Task Guessing_the_password_through_delete_account_locks_the_account()
    {
        var user = await _factory.RegisterUserAsync();

        for (var i = 0; i < 4; i++)
        {
            Assert.Equal(HttpStatusCode.BadRequest, (await DeleteAccountAsync(user.Client, new { password = $"guess-{i}-pass" })).StatusCode);
        }

        Assert.Equal((HttpStatusCode)423, (await DeleteAccountAsync(user.Client, new { password = "guess-4-pass" })).StatusCode);
        // Đang khóa: ngay cả mật khẩu đúng cũng không xóa được.
        Assert.Equal((HttpStatusCode)423, (await DeleteAccountAsync(user.Client, new { password = user.Password })).StatusCode);
        await WithDbAsync(_factory, async db => Assert.True(await db.Users.AnyAsync(u => u.Id == user.Id)));
    }

    [DbFact]
    public async Task A_google_only_account_confirms_deletion_with_its_own_email()
    {
        var email = $"g-{Guid.NewGuid():N}@example.com";
        _factory.Google.Add("token-delete", new GoogleIdentity($"sub-{Guid.NewGuid():N}", email, true, "Only", null));
        var auth = (await (await _factory.CreateClient().PostJsonAsync("/api/auth/google", new { idToken = "token-delete" })).ReadEnvelopeAsync<AuthPayload>()).Data!;
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);

        var wrong = await DeleteAccountAsync(client, new { confirmEmail = "someone-else@example.com" });
        var ok = await DeleteAccountAsync(client, new { confirmEmail = email.ToUpperInvariant() });

        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        await WithDbAsync(_factory, async db => Assert.False(await db.Users.AnyAsync(u => u.Id == auth.User.Id)));
    }
}
