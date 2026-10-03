using System.Net;
using System.Net.Http.Headers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Services;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>SEC-04 (AI cần đăng nhập, giới hạn ảnh), P2-BE-06 (lỗi thật thay vì dữ liệu mẫu, quota BR-233, dị ứng).</summary>
public class AiTests : IClassFixture<ApiFactory>
{
    private static readonly byte[] Jpeg = { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0xFF, 0xD9 };

    private readonly ApiFactory _factory;

    public AiTests(ApiFactory factory) => _factory = factory;

    private static MultipartFormDataContent Image(byte[] bytes, string contentType = "image/jpeg", string field = "image")
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        return new MultipartFormDataContent { { file, field, "photo.jpg" } };
    }

    private static Task<HttpResponseMessage> SnapAsync(HttpClient client, byte[]? bytes = null) =>
        client.PostAsync("/api/ai/snap-and-track", Image(bytes ?? Jpeg));

    private static async Task<AiQuotaPayload> QuotaAsync(HttpClient client) =>
        (await (await client.GetAsync("/api/ai/quota")).ReadEnvelopeAsync<AiQuotaPayload>()).Data!;

    private static async Task SetAllergiesAsync(HttpClient client, params int[] allergyIds) =>
        (await client.PostJsonAsync("/api/healthprofile/survey", new
        {
            gender = "Male", age = 30, heightCm = 175, currentWeightKg = 70, targetWeightKg = 65, activityLevel = "Moderate",
            goal = "Maintain", allergyIds, medicalConditionIds = new int[0], dietaryPreferenceIds = new int[0]
        })).EnsureSuccessStatusCode();

    // ───────────────────────────── SEC-04: cần đăng nhập, ảnh được kiểm tra ─────────────────────────────

    [DbFact]
    public async Task Every_ai_endpoint_requires_authentication()
    {
        var client = _factory.CreateClient();

        var snap = await SnapAsync(client);
        var fridge = await client.PostAsync("/api/ai/fridge-scanner", Image(Jpeg));
        var voice = await client.PostJsonAsync("/api/ai/voice-log", new { transcript = "sáng nay ăn phở" });
        var safety = await client.PostJsonAsync("/api/ai/check-safety", new { barcode = "8934567890123" });
        var quota = await client.GetAsync("/api/ai/quota");

        Assert.All(new[] { snap, fridge, voice, safety, quota }, r => Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode));
    }

    [DbFact]
    public async Task Uploaded_images_are_limited_in_size_and_checked_by_content()
    {
        using var factory = new ApiFactory().WithSetting("Ai:AllowDemoFallback", "true");
        var user = await factory.RegisterUserAsync();
        var big = new byte[6 * 1024 * 1024];
        Array.Copy(Jpeg, big, Jpeg.Length);

        var tooBig = await SnapAsync(user.Client, big);
        var notImage = await user.Client.PostAsync("/api/ai/snap-and-track", Image("<html>hi</html>"u8.ToArray(), "image/jpeg"));
        var wrongField = await user.Client.PostAsync("/api/ai/snap-and-track", Image(Jpeg, field: "photo"));
        var ok = await SnapAsync(user.Client);

        Assert.Equal(HttpStatusCode.BadRequest, tooBig.StatusCode);
        Assert.Contains("tối đa 5 MB", (await tooBig.ReadEnvelopeAsync<object>()).Message);
        Assert.Equal(HttpStatusCode.BadRequest, notImage.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, wrongField.StatusCode);
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
    }

    [DbFact]
    public async Task Text_inputs_are_validated()
    {
        var user = await _factory.RegisterUserAsync();

        var empty = await user.Client.PostJsonAsync("/api/ai/voice-log", new { transcript = "" });
        var huge = await user.Client.PostJsonAsync("/api/ai/voice-log", new { transcript = new string('a', 1001) });
        var nothing = await user.Client.PostJsonAsync("/api/ai/check-safety", new { });
        var badBarcode = await user.Client.PostJsonAsync("/api/ai/check-safety", new { barcode = "<script>" });
        var hugeOcr = await user.Client.PostJsonAsync("/api/ai/check-safety", new { ocrRawText = new string('x', 5001) });

        Assert.All(new[] { empty, huge, nothing, badBarcode, hugeOcr }, r => Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode));
        Assert.Contains("barcode hoặc ocrRawText", string.Join(' ', (await nothing.ReadEnvelopeAsync<object>()).Errors!));
    }

    // ───────────────────────────── Không còn "luôn thành công" bằng dữ liệu mẫu ─────────────────────────────

    [DbFact]
    public async Task Without_a_gemini_key_the_api_reports_it_instead_of_returning_fake_data_and_uses_no_quota()
    {
        var user = await _factory.RegisterUserAsync();

        var snap = await SnapAsync(user.Client);
        var voice = await user.Client.PostJsonAsync("/api/ai/voice-log", new { transcript = "sáng nay ăn phở" });

        Assert.True(snap.StatusCode == HttpStatusCode.ServiceUnavailable, await snap.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.ServiceUnavailable, voice.StatusCode);
        Assert.Contains("ai_not_configured", (await snap.ReadEnvelopeAsync<object>()).Errors!);
        Assert.Equal(0, (await QuotaAsync(user.Client)).Used);   // lỗi không tốn lượt
    }

    [DbFact]
    public async Task Demo_mode_must_be_enabled_explicitly_and_is_labelled()
    {
        using var factory = new ApiFactory().WithSetting("Ai:AllowDemoFallback", "true");
        var user = await factory.RegisterUserAsync();

        var snap = (await (await SnapAsync(user.Client)).ReadEnvelopeAsync<SnapPayload>()).Data!;
        var voice = (await (await user.Client.PostJsonAsync("/api/ai/voice-log", new { transcript = "trưa nay ăn cơm gà" })).ReadEnvelopeAsync<VoicePayload>()).Data!;

        Assert.True(snap.IsDemo);
        Assert.True(voice.IsDemo);
        Assert.Equal("Lunch", voice.MealType);
    }

    [DbFact]
    public async Task A_real_upstream_failure_is_a_502_and_never_fake_data_unless_demo_is_enabled()
    {
        var stub = new StubGeminiHandler { Status = HttpStatusCode.InternalServerError };
        using var strict = StubbedFactory(new ApiFactory().WithSetting("Gemini:ApiKey", "test-gemini-key"), stub);
        var user = await strict.RegisterUserAsync();

        var response = await SnapAsync(user.Client);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.Contains("ai_upstream_error", (await response.ReadEnvelopeAsync<object>()).Errors!);
        Assert.Equal(0, (await QuotaAsync(user.Client)).Used);

        using var demo = StubbedFactory(new ApiFactory().WithSetting("Gemini:ApiKey", "test-gemini-key").WithSetting("Ai:AllowDemoFallback", "true"), stub);
        var demoUser = await demo.RegisterUserAsync();
        Assert.True((await (await SnapAsync(demoUser.Client)).ReadEnvelopeAsync<SnapPayload>()).Data!.IsDemo);
    }

    // ───────────────────────────── Hạn mức (BR-233) ─────────────────────────────

    [DbFact]
    public async Task Free_accounts_have_a_daily_quota_that_pro_accounts_do_not()
    {
        using var factory = new ApiFactory()
            .WithSetting("Ai:AllowDemoFallback", "true")
            .WithSetting("Ai:FreeDailyLimit", "2")
            .WithSetting("Subscription:AllowMockActivation", "true");
        var user = await factory.RegisterUserAsync();

        Assert.Equal(HttpStatusCode.OK, (await SnapAsync(user.Client)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await user.Client.PostJsonAsync("/api/ai/voice-log", new { transcript = "sáng nay ăn bánh mì" })).StatusCode);

        var exhausted = await SnapAsync(user.Client);
        Assert.Equal((HttpStatusCode)429, exhausted.StatusCode);
        var envelope = await exhausted.ReadEnvelopeAsync<object>();
        Assert.Contains("ai_quota_exceeded", envelope.Errors!);
        Assert.Contains("2 lượt", envelope.Message);

        var quota = await QuotaAsync(user.Client);
        Assert.False(quota.IsUnlimited);
        Assert.Equal(2, quota.Limit);
        Assert.Equal(2, quota.Used);
        Assert.Equal(0, quota.Remaining);
        Assert.True(quota.ResetsAt > DateTime.UtcNow && quota.ResetsAt <= DateTime.UtcNow.AddDays(1));

        // check-safety là tính năng an toàn: không bị hạn mức chặn.
        Assert.Equal(HttpStatusCode.OK, (await user.Client.PostJsonAsync("/api/ai/check-safety", new { barcode = "8934567890123" })).StatusCode);

        // Nâng cấp Pro → không giới hạn.
        (await user.Client.PostJsonAsync("/api/subscription/activate-mock", new { planId = "PRO_MONTHLY" })).EnsureSuccessStatusCode();
        var pro = await QuotaAsync(user.Client);
        Assert.True(pro.IsUnlimited);
        Assert.Null(pro.Limit);
        Assert.Equal(HttpStatusCode.OK, (await SnapAsync(user.Client)).StatusCode);
    }

    [DbFact]
    public async Task Usage_from_before_today_does_not_count()
    {
        using var factory = new ApiFactory().WithSetting("Ai:AllowDemoFallback", "true").WithSetting("Ai:FreeDailyLimit", "1");
        var user = await factory.RegisterUserAsync();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.AiUsageLogs.Add(new AiUsageLog { UserId = user.Id, Kind = "snap", CreatedAt = DateTime.UtcNow.AddDays(-2) });
            await db.SaveChangesAsync();
        }

        Assert.Equal(0, (await QuotaAsync(user.Client)).Used);
        Assert.Equal(HttpStatusCode.OK, (await SnapAsync(user.Client)).StatusCode);
        Assert.Equal((HttpStatusCode)429, (await SnapAsync(user.Client)).StatusCode);
    }

    // ───────────────────────────── Dị ứng & cách gọi Gemini ─────────────────────────────

    [DbFact]
    public async Task The_server_adds_allergy_warnings_the_model_forgot_and_flags_unsafe_products()
    {
        var stub = new StubGeminiHandler
        {
            ModelText = """
                {"dishName":"Tôm rang me","estimatedGrams":200,"confidenceScore":0.9,"calories":300,"carbs":10,"protein":30,"fat":12,
                 "detectedIngredients":["Tôm","Me","Hành lá"],"allergyWarnings":[],"healthTips":"ok"}
                """
        };
        using var factory = StubbedFactory(new ApiFactory().WithSetting("Gemini:ApiKey", "test-gemini-key"), stub);
        var seafoodAllergic = await factory.RegisterUserAsync();
        await SetAllergiesAsync(seafoodAllergic.Client, 1);          // Hải sản
        var notAllergic = await factory.RegisterUserAsync();

        var withAllergy = (await (await SnapAsync(seafoodAllergic.Client)).ReadEnvelopeAsync<SnapPayload>()).Data!;
        var without = (await (await SnapAsync(notAllergic.Client)).ReadEnvelopeAsync<SnapPayload>()).Data!;

        Assert.False(withAllergy.IsDemo);
        Assert.Contains(withAllergy.AllergyWarnings, w => w.Contains("Hải sản"));
        Assert.Empty(without.AllergyWarnings);

        // Sản phẩm có đậu phộng, người dùng dị ứng đậu phộng nhưng mô hình báo "an toàn".
        stub.ModelText = """
            {"isSafe":true,"alerts":[],"detectedIngredients":["Bột mì","Đường","Đậu phộng rang"],
             "extractedNutrition":{"caloriesPerServing":200,"servingSize":"30g","sugarGrams":10,"sodiumMg":100,"totalFatGrams":5}}
            """;
        await SetAllergiesAsync(seafoodAllergic.Client, 2);          // Đậu phộng
        var unsafeProduct = (await (await seafoodAllergic.Client.PostJsonAsync("/api/ai/check-safety", new { ocrRawText = "Thành phần: bột mì, đường, đậu phộng rang" }))
            .ReadEnvelopeAsync<SafetyPayload>()).Data!;

        Assert.False(unsafeProduct.IsSafe);
        Assert.Contains(unsafeProduct.Alerts, a => a.Type == "ALLERGY" && a.Severity == "DANGER" && a.Message.Contains("Đậu phộng"));

        var safeForOthers = (await (await notAllergic.Client.PostJsonAsync("/api/ai/check-safety", new { ocrRawText = "Thành phần: bột mì, đường, đậu phộng rang" }))
            .ReadEnvelopeAsync<SafetyPayload>()).Data!;
        Assert.True(safeForOthers.IsSafe);
    }

    [DbFact]
    public async Task The_gemini_key_is_sent_in_a_header_and_never_in_the_url()
    {
        var stub = new StubGeminiHandler { ModelText = """{"detectedIngredients":["Trứng"],"suggestedRecipes":[]}""" };
        using var factory = StubbedFactory(new ApiFactory().WithSetting("Gemini:ApiKey", "test-gemini-key"), stub);
        var user = await factory.RegisterUserAsync();

        var response = await user.Client.PostAsync("/api/ai/fridge-scanner", Image(Jpeg));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var call = Assert.Single(stub.Calls);
        Assert.Equal("test-gemini-key", call.ApiKeyHeader);
        Assert.DoesNotContain("test-gemini-key", call.Url.ToString());
        Assert.DoesNotContain("key=", call.Url.Query);
        Assert.Contains("image/jpeg", call.Body);   // mime lấy từ nội dung ảnh, không phải từ client
    }

    /// <summary>Cho factory gọi "Gemini" giả thay vì Internet.</summary>
    private static ApiFactory StubbedFactory(ApiFactory factory, StubGeminiHandler stub) =>
        factory.WithServices(services =>
            services.AddHttpClient<IAiVisionService, GeminiAiVisionService>().ConfigurePrimaryHttpMessageHandler(() => stub));
}
