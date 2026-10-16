using System.Net;
using System.Net.Http.Headers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;
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
    public async Task Pro_only_features_are_refused_to_free_accounts_by_the_server_not_just_hidden_in_the_app()
    {
        var free = await _factory.RegisterUserAsync();

        var fridge = await free.Client.PostAsync("/api/ai/fridge-scanner", Image(Jpeg));
        var plan = await free.Client.PostJsonAsync("/api/mealplanner/auto-generate", new { startDate = "2026-07-06" });

        Assert.Equal(HttpStatusCode.Forbidden, fridge.StatusCode);
        Assert.Contains("pro_required", (await fridge.ReadEnvelopeAsync<object>()).Errors!);
        Assert.Equal(HttpStatusCode.Forbidden, plan.StatusCode);
        Assert.Contains("pro_required", (await plan.ReadEnvelopeAsync<object>()).Errors!);
        Assert.Equal(0, (await QuotaAsync(free.Client)).Used);   // bị chặn thì không tốn lượt AI
    }

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

    [Fact]
    public async Task In_development_a_configured_key_reports_gemini_failures_instead_of_returning_demo_data()
    {
        // Gọi thẳng service, không cần database: userId = null nên không đọc hồ sơ sức khỏe.
        var retired = new StubGeminiHandler { Status = HttpStatusCode.NotFound };

        var withKey = await DevelopmentService(retired, apiKey: "test-gemini-key").SnapAndTrackAsync(Jpeg, "image/jpeg");
        var withoutKey = await DevelopmentService(retired, apiKey: "").SnapAndTrackAsync(Jpeg, "image/jpeg");

        Assert.False(withKey.Success);
        Assert.Equal(ApiErrorKind.UpstreamFailure, withKey.ErrorKind);
        Assert.Contains("ai_upstream_error", withKey.Errors!);
        Assert.True(withoutKey.Data!.IsDemo);   // chưa có khóa: Development vẫn demo được như trước
    }

    // ───────────────────────────── Model bị ngừng / quá tải, câu trả lời lệch định dạng ─────────────────────────────

    private const string SnapJson = """{"dishName":"Salad đậu hũ","estimatedGrams":350,"calories":380,"detectedIngredients":["Đậu hũ"],"allergyWarnings":[]}""";

    [DbFact]
    public async Task A_retired_or_overloaded_model_falls_back_to_the_next_configured_model()
    {
        var stub = new StubGeminiHandler { ModelText = SnapJson };
        stub.StatusByModel["retired-model"] = HttpStatusCode.NotFound;
        stub.StatusByModel["busy-model"] = HttpStatusCode.ServiceUnavailable;
        using var factory = StubbedFactory(new ApiFactory()
            .WithSetting("Gemini:ApiKey", "test-gemini-key")
            .WithSetting("Gemini:Model", "retired-model")
            .WithSetting("Gemini:FallbackModels", "busy-model, working-model"), stub);
        var user = await factory.RegisterUserAsync();

        var response = await SnapAsync(user.Client);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = (await response.ReadEnvelopeAsync<SnapPayload>()).Data!;
        Assert.Equal("Salad đậu hũ", result.DishName);
        Assert.False(result.IsDemo);
        Assert.Equal(new[] { "retired-model", "busy-model", "working-model" }, stub.Calls.Select(c => c.Model));
        Assert.All(stub.Calls, call => Assert.Equal("test-gemini-key", call.ApiKeyHeader));
    }

    [DbFact]
    public async Task A_model_that_answers_too_slowly_gives_way_to_the_next_model()
    {
        var stub = new StubGeminiHandler { ModelText = SnapJson };
        stub.DelayByModel["slow-model"] = TimeSpan.FromSeconds(30);
        using var factory = StubbedFactory(new ApiFactory()
            .WithSetting("Gemini:ApiKey", "test-gemini-key")
            .WithSetting("Gemini:Model", "slow-model")
            .WithSetting("Gemini:FallbackModels", "fast-model")
            .WithSetting("Gemini:AttemptTimeoutSeconds", "1"), stub);
        var user = await factory.RegisterUserAsync();

        var response = await SnapAsync(user.Client);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Salad đậu hũ", (await response.ReadEnvelopeAsync<SnapPayload>()).Data!.DishName);
        Assert.Equal(new[] { "slow-model", "fast-model" }, stub.Calls.Select(c => c.Model));
    }

    [Fact]
    public async Task A_label_without_some_numbers_is_still_read_when_the_model_answers_null()
    {
        // Nhãn không ghi đường/natri: model trả null thay vì 0 — trước đây làm hỏng cả kết quả ("AI không phân tích được").
        var stub = new StubGeminiHandler
        {
            ModelText = """
                {"isSafe":true,"alerts":[],"ocrText":"Bánh quy. Khẩu phần 30 g: 150 kcal, chất béo 7,5 g","productName":"Bánh quy",
                 "detectedIngredients":["Bột mì"],
                 "extractedNutrition":{"basis":"perServing","servingSize":"30 g","servingGrams":30,"caloriesPerServing":"150",
                  "proteinGrams":null,"carbsGrams":null,"sugarGrams":null,"sodiumMg":null,"totalFatGrams":7.5}}
                """
        };

        var result = await DevelopmentService(stub, apiKey: "test-gemini-key").ScanLabelAsync(Jpeg, "image/jpeg");

        Assert.True(result.Success, result.Message);
        var nutrition = result.Data!.ExtractedNutrition!;
        Assert.Equal(150, nutrition.CaloriesPerServing);
        Assert.Equal(7.5, nutrition.TotalFatGrams);
        Assert.Equal(0, nutrition.SugarGrams);
        Assert.Equal(0, nutrition.SodiumMg);
        Assert.Null(nutrition.ProteinGrams);   // trường cho phép trống vẫn là "không có trên nhãn"
        Assert.Null(nutrition.CarbsGrams);
    }

    [Fact]
    public async Task Gemini_is_asked_to_think_less_by_default_so_answers_come_back_faster()
    {
        var stub = new StubGeminiHandler { ModelText = SnapJson };

        var result = await DevelopmentService(stub, apiKey: "test-gemini-key").SnapAndTrackAsync(Jpeg, "image/jpeg");

        Assert.True(result.Success);
        Assert.Contains("\"thinkingConfig\":{\"thinkingLevel\":\"low\"}", Assert.Single(stub.Calls).Body);
    }

    [DbFact]
    public async Task A_rejected_request_is_not_retried_on_other_models()
    {
        var stub = new StubGeminiHandler { Status = HttpStatusCode.BadRequest };
        using var factory = StubbedFactory(new ApiFactory()
            .WithSetting("Gemini:ApiKey", "test-gemini-key")
            .WithSetting("Gemini:Model", "main-model")
            .WithSetting("Gemini:FallbackModels", "other-model"), stub);
        var user = await factory.RegisterUserAsync();

        var response = await SnapAsync(user.Client);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.Equal("main-model", Assert.Single(stub.Calls).Model);
    }

    [DbFact]
    public async Task An_answer_wrapped_in_an_array_or_a_code_fence_is_still_read()
    {
        var stub = new StubGeminiHandler { ModelText = $"[{SnapJson}]" };
        using var factory = StubbedFactory(new ApiFactory().WithSetting("Gemini:ApiKey", "test-gemini-key"), stub);
        var user = await factory.RegisterUserAsync();

        var wrapped = (await (await SnapAsync(user.Client)).ReadEnvelopeAsync<SnapPayload>()).Data!;
        stub.ModelText = $"```json\n{SnapJson}\n```";
        var fenced = (await (await SnapAsync(user.Client)).ReadEnvelopeAsync<SnapPayload>()).Data!;

        Assert.Equal("Salad đậu hũ", wrapped.DishName);
        Assert.Equal("Salad đậu hũ", fenced.DishName);
        Assert.False(wrapped.IsDemo || fenced.IsDemo);
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
        Assert.Equal(HttpStatusCode.OK, (await user.Client.PostJsonAsync("/api/ai/check-safety", new { ocrRawText = "Thành phần: bột mì, đường" })).StatusCode);

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
        await factory.GrantProAsync(user);

        var response = await user.Client.PostAsync("/api/ai/fridge-scanner", Image(Jpeg));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var call = Assert.Single(stub.Calls);
        Assert.Equal("test-gemini-key", call.ApiKeyHeader);
        Assert.DoesNotContain("test-gemini-key", call.Url.ToString());
        Assert.DoesNotContain("key=", call.Url.Query);
        Assert.Contains("image/jpeg", call.Body);   // mime lấy từ nội dung ảnh, không phải từ client
    }

    // ───────────────────────────── Mã vạch tra CSDL, đọc nhãn từ ảnh, voice từ file ghi âm (báo cáo gap B15, §6) ─────────────────────────────

    private static readonly byte[] Wav =
    {
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20,
        0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x80, 0x3E, 0x00, 0x00, 0x00, 0x7D, 0x00, 0x00,
        0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00
    };

    private static MultipartFormDataContent Audio(byte[] bytes) =>
        new() { { new ByteArrayContent(bytes), "audio", "voice.wav" } };

    private static async Task SetProfileAsync(HttpClient client, int[] allergyIds, int[] conditionIds) =>
        (await client.PostJsonAsync("/api/healthprofile/survey", new
        {
            gender = "Male", age = 30, heightCm = 175, currentWeightKg = 70, targetWeightKg = 65, activityLevel = "Moderate",
            goal = "Maintain", allergyIds, medicalConditionIds = conditionIds, dietaryPreferenceIds = new int[0]
        })).EnsureSuccessStatusCode();

    [DbFact]
    public async Task A_barcode_is_checked_against_the_database_and_never_sent_to_the_ai()
    {
        var stub = new StubGeminiHandler();
        using var factory = StubbedFactory(new ApiFactory().WithSetting("Gemini:ApiKey", "test-gemini-key"), stub);
        var user = await factory.RegisterUserAsync();
        await SetProfileAsync(user.Client, allergyIds: new[] { 2 }, conditionIds: new[] { 1 }); // đậu phộng, tiểu đường
        (await user.Client.PostJsonAsync("/api/foods", new
        {
            name = "Bánh quy bơ đậu phộng", category = "Snack", barcode = "8934567000017", caloriesPer100g = 480,
            carbsPer100g = 62, fatPer100g = 22, proteinPer100g = 8, sugarPer100g = 30, sodiumMgPer100g = 250, allergyIds = new[] { 2 }
        })).EnsureSuccessStatusCode();

        var response = await user.Client.PostJsonAsync("/api/ai/check-safety", new { barcode = "8934567000017" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = (await response.ReadEnvelopeAsync<LabelSafetyPayload>()).Data!;
        Assert.Equal("database", result.Source);
        Assert.False(result.IsDemo);
        Assert.False(result.IsSafe);
        Assert.Equal("Bánh quy bơ đậu phộng", result.Product!.Name);
        Assert.Equal(new[] { 2 }, result.Product.MatchedAllergyIds);
        Assert.Contains(result.Alerts, a => a.Type == "ALLERGY" && a.Severity == "DANGER");
        Assert.Contains(result.Alerts, a => a.Type == "HIGH_SUGAR" && a.Severity == "DANGER" && a.Message.Contains("tiểu đường"));
        Assert.Contains(result.Alerts, a => a.Type == "HIGH_FAT" && a.Severity == "WARNING");
        Assert.Equal("per100g", result.ExtractedNutrition!.Basis);
        Assert.Equal(8, result.ExtractedNutrition.ProteinGrams);
        Assert.Empty(stub.Calls);

        var unknown = await user.Client.PostJsonAsync("/api/ai/check-safety", new { barcode = "8930000000000" });
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.Contains("product_not_found", (await unknown.ReadEnvelopeAsync<object>()).Errors!);
        Assert.Empty(stub.Calls);

        // Chưa có sản phẩm nhưng có văn bản nhãn: AI chỉ nhận văn bản, không nhận mã vạch.
        stub.ModelText = """{"isSafe":true,"alerts":[],"detectedIngredients":["Bột mì"],"extractedNutrition":null}""";
        var withText = await user.Client.PostJsonAsync("/api/ai/check-safety", new { barcode = "8930000000000", ocrRawText = "Thành phần: bột mì" });
        Assert.Equal(HttpStatusCode.OK, withText.StatusCode);
        Assert.DoesNotContain("8930000000000", Assert.Single(stub.Calls).Body);
    }

    [DbFact]
    public async Task A_label_photo_is_read_by_the_ai_checked_by_code_and_does_not_use_quota()
    {
        var stub = new StubGeminiHandler
        {
            ModelText = """
                {"ocrText":"Thành phần: bột mì, đường, đậu phộng. Khẩu phần 40 g: 200 kcal, natri 400 mg","productName":"Bánh quy",
                 "isSafe":true,"alerts":[],"detectedIngredients":["Bột mì","Đường","Đậu phộng"],
                 "extractedNutrition":{"basis":"perServing","servingSize":"40 g","servingGrams":40,"caloriesPerServing":200,
                   "proteinGrams":3,"carbsGrams":25,"sugarGrams":8,"sodiumMg":400,"totalFatGrams":9}}
                """
        };
        using var factory = StubbedFactory(new ApiFactory().WithSetting("Gemini:ApiKey", "test-gemini-key").WithSetting("Ai:FreeDailyLimit", "1"), stub);
        var user = await factory.RegisterUserAsync();
        await SetProfileAsync(user.Client, allergyIds: new[] { 2 }, conditionIds: new[] { 3 }); // đậu phộng, cao huyết áp

        var response = await user.Client.PostAsync("/api/ai/scan-label", Image(Jpeg));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = (await response.ReadEnvelopeAsync<LabelSafetyPayload>()).Data!;
        Assert.Equal("ai", result.Source);
        Assert.Equal("Bánh quy", result.ProductName);
        Assert.Contains("đậu phộng", result.OcrText);
        Assert.False(result.IsSafe);
        Assert.Contains(result.Alerts, a => a.Type == "ALLERGY" && a.Message.Contains("Đậu phộng"));
        // 400 mg natri / 40 g = 1000 mg/100 g > 600 → cảnh báo, nặng hơn vì khai báo cao huyết áp.
        Assert.Contains(result.Alerts, a => a.Type == "HIGH_SODIUM" && a.Severity == "DANGER");
        Assert.Contains("image/jpeg", Assert.Single(stub.Calls).Body);
        Assert.Equal(0, (await QuotaAsync(user.Client)).Used);

        stub.ModelText = """{"ocrText":"","detectedIngredients":[],"extractedNutrition":null}""";
        var unreadable = await user.Client.PostAsync("/api/ai/scan-label", Image(Jpeg));
        Assert.Equal(HttpStatusCode.BadRequest, unreadable.StatusCode);
        Assert.Contains("label_unreadable", (await unreadable.ReadEnvelopeAsync<object>()).Errors!);
    }

    [DbFact]
    public async Task Scanning_endpoints_are_rate_limited_per_user()
    {
        using var factory = new ApiFactory().WithSetting("Ai:AllowDemoFallback", "true").WithSetting("RateLimiting:ScannerPermitsPerMinute", "2");
        var user = await factory.RegisterUserAsync();
        var other = await factory.RegisterUserAsync();

        Assert.Equal(HttpStatusCode.OK, (await user.Client.PostAsync("/api/ai/scan-label", Image(Jpeg))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await user.Client.PostJsonAsync("/api/ai/check-safety", new { ocrRawText = "bột mì" })).StatusCode);
        Assert.Equal((HttpStatusCode)429, (await user.Client.PostAsync("/api/ai/scan-label", Image(Jpeg))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await other.Client.PostAsync("/api/ai/scan-label", Image(Jpeg))).StatusCode);
    }

    [DbFact]
    public async Task Voice_can_be_sent_as_a_recording_and_comes_back_with_its_transcript()
    {
        var stub = new StubGeminiHandler
        {
            ModelText = """
                {"transcript":"trưa nay tôi ăn một đĩa cơm tấm","mealType":"lunch",
                 "extractedItems":[{"foodName":"Cơm tấm sườn","portionDescription":"1 đĩa","portionGrams":400,"calories":650,"carbs":80,"protein":30,"fat":20}],
                 "totalCalories":650,"totalCarbs":80,"totalProtein":30,"totalFat":20}
                """
        };
        using var factory = StubbedFactory(new ApiFactory().WithSetting("Gemini:ApiKey", "test-gemini-key"), stub);
        var user = await factory.RegisterUserAsync();

        var response = await user.Client.PostAsync("/api/ai/voice-log/audio", Audio(Wav));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = (await response.ReadEnvelopeAsync<VoiceAudioPayload>()).Data!;
        Assert.Equal("trưa nay tôi ăn một đĩa cơm tấm", result.Transcript);
        Assert.Equal("Lunch", result.MealType);
        Assert.False(result.IsDemo);
        Assert.Contains("audio/wav", Assert.Single(stub.Calls).Body);
        Assert.Equal(1, (await QuotaAsync(user.Client)).Used);

        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.PostAsync("/api/ai/voice-log/audio", Audio(Jpeg))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.PostAsync("/api/ai/voice-log/audio", new MultipartFormDataContent())).StatusCode);

        stub.ModelText = """{"transcript":"ừm","mealType":"Snack","extractedItems":[]}""";
        var silent = await user.Client.PostAsync("/api/ai/voice-log/audio", Audio(Wav));
        Assert.Equal(HttpStatusCode.BadRequest, silent.StatusCode);
        Assert.Contains("voice_unrecognized", (await silent.ReadEnvelopeAsync<object>()).Errors!);
        Assert.Equal(1, (await QuotaAsync(user.Client)).Used); // thất bại không tốn lượt

        Assert.Equal(HttpStatusCode.Unauthorized, (await factory.CreateClient().PostAsync("/api/ai/voice-log/audio", Audio(Wav))).StatusCode);
    }

    // ───────────────────────────── Ảnh món ăn được lưu lại, phụ đề tạm khi ghi âm ─────────────────────────────

    [DbFact]
    public async Task A_snapped_photo_is_kept_logged_with_the_meal_and_removed_with_the_last_item_using_it()
    {
        var stub = new StubGeminiHandler { ModelText = SnapJson };
        using var factory = StubbedFactory(new ApiFactory().WithSetting("Gemini:ApiKey", "test-gemini-key"), stub);
        var user = await factory.RegisterUserAsync();

        var snap = (await (await SnapAsync(user.Client)).ReadEnvelopeAsync<SnapPayload>()).Data!;

        Assert.Contains($"/uploads/meals/{user.Id:N}/", snap.ImageUrl);
        Assert.EndsWith(".jpg", snap.ImageUrl);
        var photoPath = new Uri(snap.ImageUrl!).PathAndQuery;
        var photo = await factory.CreateClient().GetAsync(photoPath);
        Assert.Equal(HttpStatusCode.OK, photo.StatusCode);
        Assert.Equal(Jpeg, await photo.Content.ReadAsByteArrayAsync());

        // Ghi hai món cùng ảnh → nhật ký trả lại đúng ảnh cho từng món.
        var logged = await user.Client.PostJsonAsync("/api/nutritiondiary/log/batch", new
        {
            mealType = "Lunch",
            items = new[]
            {
                new { foodName = snap.DishName, servingSize = 350, unit = "g", calories = 380, logMethod = "AiImage", imageUrl = snap.ImageUrl },
                new { foodName = "Canh rau", servingSize = 200, unit = "g", calories = 40, logMethod = "AiImage", imageUrl = snap.ImageUrl }
            }
        });
        logged.EnsureSuccessStatusCode();
        var items = (await logged.ReadEnvelopeAsync<List<DiaryItemPayload>>()).Data!;
        Assert.All(items, item => Assert.Equal(snap.ImageUrl, item.ImageUrl));

        // Còn món dùng ảnh thì giữ file; xóa món cuối cùng thì file ảnh cũng bị xóa.
        (await user.Client.DeleteAsync($"/api/nutritiondiary/items/{items[0].Id}")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await factory.CreateClient().GetAsync(photoPath)).StatusCode);
        (await user.Client.DeleteAsync($"/api/nutritiondiary/items/{items[1].Id}")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound, (await factory.CreateClient().GetAsync(photoPath)).StatusCode);
    }

    [DbFact]
    public async Task Live_captions_transcribe_the_recording_without_using_quota_but_stop_once_the_quota_is_gone()
    {
        var stub = new StubGeminiHandler { ModelText = """{"transcript":"  trưa nay tôi ăn một tô phở  "}""" };
        using var factory = StubbedFactory(new ApiFactory().WithSetting("Gemini:ApiKey", "test-gemini-key").WithSetting("Ai:FreeDailyLimit", "1"), stub);
        var user = await factory.RegisterUserAsync();

        var response = await user.Client.PostAsync("/api/ai/voice-log/transcribe", Audio(Wav));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var caption = (await response.ReadEnvelopeAsync<VoiceTranscriptPayload>()).Data!;
        Assert.Equal("trưa nay tôi ăn một tô phở", caption.Transcript);
        Assert.False(caption.IsDemo);
        Assert.Contains("audio/wav", Assert.Single(stub.Calls).Body);
        Assert.Equal(0, (await QuotaAsync(user.Client)).Used);   // phụ đề tạm không tốn lượt

        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.PostAsync("/api/ai/voice-log/transcribe", Audio(Jpeg))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await factory.CreateClient().PostAsync("/api/ai/voice-log/transcribe", Audio(Wav))).StatusCode);

        // Hết lượt thì không phân tích được nữa nên phụ đề cũng dừng.
        stub.ModelText = SnapJson;
        (await SnapAsync(user.Client)).EnsureSuccessStatusCode();
        var exhausted = await user.Client.PostAsync("/api/ai/voice-log/transcribe", Audio(Wav));
        Assert.Equal((HttpStatusCode)429, exhausted.StatusCode);
        Assert.Contains("ai_quota_exceeded", (await exhausted.ReadEnvelopeAsync<object>()).Errors!);
    }

    [DbFact]
    public async Task Live_captions_are_rate_limited_per_user()
    {
        using var factory = new ApiFactory().WithSetting("Ai:AllowDemoFallback", "true").WithSetting("RateLimiting:VoiceTranscribePermitsPerMinute", "2");
        var user = await factory.RegisterUserAsync();
        var other = await factory.RegisterUserAsync();

        Assert.Equal(HttpStatusCode.OK, (await user.Client.PostAsync("/api/ai/voice-log/transcribe", Audio(Wav))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await user.Client.PostAsync("/api/ai/voice-log/transcribe", Audio(Wav))).StatusCode);
        Assert.Equal((HttpStatusCode)429, (await user.Client.PostAsync("/api/ai/voice-log/transcribe", Audio(Wav))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await other.Client.PostAsync("/api/ai/voice-log/transcribe", Audio(Wav))).StatusCode);
    }

    /// <summary>Cho factory gọi "Gemini" giả thay vì Internet.</summary>
    private static ApiFactory StubbedFactory(ApiFactory factory, StubGeminiHandler stub) =>
        factory.WithServices(services =>
            services.AddHttpClient<IAiVisionService, GeminiAiVisionService>().ConfigurePrimaryHttpMessageHandler(() => stub));

    /// <summary>Service đứng riêng ở môi trường Development (Ai:AllowDemoFallback để trống), gọi "Gemini" giả.</summary>
    private static GeminiAiVisionService DevelopmentService(StubGeminiHandler stub, string apiKey) =>
        new(new HttpClient(stub),
            new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Gemini:ApiKey"] = apiKey }).Build(),
            new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql("Host=localhost").Options),
            NullLogger<GeminiAiVisionService>.Instance,
            Microsoft.Extensions.Options.Options.Create(new AiOptions()),
            Microsoft.Extensions.Options.Options.Create(new ProductSafetyOptions()),
            new Microsoft.Extensions.Hosting.Internal.HostingEnvironment { EnvironmentName = "Development" });
}
