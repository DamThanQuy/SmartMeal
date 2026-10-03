using System.Net;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>P1-BE-04 / 04a: hồ sơ sức khỏe — ngày sinh, chế độ ăn, PUT từng phần, lưu lại nhiều lần, danh mục có mã.</summary>
public class HealthProfileTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public HealthProfileTests(ApiFactory factory) => _factory = factory;

    private static object Survey(
        string gender = "Male", int? age = 30, string? dateOfBirth = null, double height = 175, double weight = 70,
        double target = 65, string activity = "Moderate", string goal = "LoseWeight", int[]? allergies = null,
        int[]? conditions = null, int[]? diets = null, int? waterGoalMl = null) => new
    {
        gender,
        age,
        dateOfBirth,
        heightCm = height,
        currentWeightKg = weight,
        targetWeightKg = target,
        activityLevel = activity,
        goal,
        allergyIds = allergies ?? Array.Empty<int>(),
        medicalConditionIds = conditions ?? Array.Empty<int>(),
        dietaryPreferenceIds = diets ?? Array.Empty<int>(),
        waterGoalMl
    };

    private static async Task<HealthProfilePayload> ExpectProfileAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<HealthProfilePayload>()).Data!;
    }

    private static async Task<HealthProfilePayload> GetProfileAsync(HttpClient client) =>
        await ExpectProfileAsync(await client.GetAsync("/api/healthprofile"));

    private static async Task<WeightHistoryPayload> GetWeightHistoryAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/healthprofile/weight-history");
        response.EnsureSuccessStatusCode();
        return (await response.ReadEnvelopeAsync<WeightHistoryPayload>()).Data!;
    }

    [DbFact]
    public async Task Survey_creates_the_profile_and_computes_metrics()
    {
        var user = await _factory.RegisterUserAsync();

        var profile = await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey()));

        // Nam, 30 tuổi, 175 cm, 70 kg, vận động vừa, giảm cân (Mifflin-St Jeor).
        Assert.Equal(22.9, profile.Bmi);
        Assert.Equal(1648.75, profile.Bmr);
        Assert.Equal(2556, profile.Tdee);
        Assert.Equal(2056, profile.DailyCaloriesTarget);
        Assert.Equal(Math.Round(2056 * 0.5 / 4), profile.DailyCarbsTargetGrams);
        Assert.Equal(Math.Round(2056 * 0.25 / 9), profile.DailyFatTargetGrams);
        Assert.Equal(Math.Round(2056 * 0.25 / 4), profile.DailyProteinTargetGrams);
        Assert.Equal(30, profile.Age);
        Assert.Null(profile.DateOfBirth);
        Assert.Equal(2000, profile.WaterGoalMl);
        Assert.Empty(profile.AllergyIds);

        var me = (await (await user.Client.GetAsync("/api/auth/me")).ReadEnvelopeAsync<UserPayload>()).Data!;
        Assert.True(me.HasCompletedSurvey);
    }

    [DbFact]
    public async Task Survey_with_date_of_birth_stores_it_and_derives_the_age()
    {
        var user = await _factory.RegisterUserAsync();
        var dob = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(-25).AddDays(-10);

        var created = await ExpectProfileAsync(await user.Client.PostJsonAsync(
            "/api/healthprofile/survey", Survey(age: null, dateOfBirth: dob.ToString("yyyy-MM-dd"))));

        Assert.Equal(25, created.Age);
        Assert.Equal(dob, created.DateOfBirth);
        var fetched = await GetProfileAsync(user.Client);
        Assert.Equal(dob, fetched.DateOfBirth);
        Assert.Equal(25, fetched.Age);
    }

    [DbFact]
    public async Task Survey_requires_age_or_date_of_birth()
    {
        var user = await _factory.RegisterUserAsync();

        var response = await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey(age: null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("dateOfBirth hoặc age", (await response.ReadEnvelopeAsync<object>()).Message);
    }

    [DbFact]
    public async Task Survey_rejects_out_of_range_and_unknown_values_with_clear_messages()
    {
        var user = await _factory.RegisterUserAsync();

        var response = await user.Client.PostJsonAsync("/api/healthprofile/survey",
            Survey(gender: "Alien", height: 10, weight: 5, target: 999, activity: "Lazy", goal: "Fly"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = (await response.ReadEnvelopeAsync<object>()).Errors!;
        Assert.Contains(errors, e => e.Contains("Chiều cao phải từ 100 đến 250 cm"));
        Assert.Contains(errors, e => e.Contains("Cân nặng hiện tại phải từ 30 đến 300 kg"));
        Assert.Contains(errors, e => e.Contains("Cân nặng mục tiêu phải từ 30 đến 300 kg"));
        Assert.Contains(errors, e => e.Contains("Male, Female, Other"));
        Assert.Contains(errors, e => e.Contains("Sedentary"));
        Assert.Contains(errors, e => e.Contains("LoseWeight"));
    }

    [DbFact]
    public async Task Survey_rejects_a_future_or_implausible_date_of_birth()
    {
        var user = await _factory.RegisterUserAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var future = await user.Client.PostJsonAsync("/api/healthprofile/survey",
            Survey(age: null, dateOfBirth: today.AddDays(5).ToString("yyyy-MM-dd")));
        var tooYoung = await user.Client.PostJsonAsync("/api/healthprofile/survey",
            Survey(age: null, dateOfBirth: today.AddYears(-5).ToString("yyyy-MM-dd")));
        var tooOld = await user.Client.PostJsonAsync("/api/healthprofile/survey",
            Survey(age: null, dateOfBirth: today.AddYears(-130).ToString("yyyy-MM-dd")));

        Assert.Equal(HttpStatusCode.BadRequest, future.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, tooYoung.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, tooOld.StatusCode);
    }

    [DbFact]
    public async Task Enumerations_are_case_insensitive_and_stored_in_canonical_form()
    {
        var user = await _factory.RegisterUserAsync();

        var profile = await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey",
            Survey(gender: "female", activity: "VERYACTIVE", goal: "gainmuscle")));

        Assert.Equal("Female", profile.Gender);
        Assert.Equal("VeryActive", profile.ActivityLevel);
        Assert.Equal("GainMuscle", profile.Goal);
    }

    [DbFact]
    public async Task Gender_other_currently_uses_the_female_bmr_formula()
    {
        var user = await _factory.RegisterUserAsync();

        var profile = await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey",
            Survey(gender: "Other", age: 30, height: 175, weight: 70)));

        // 10*70 + 6.25*175 - 5*30 - 161 (công thức nữ). Ghi lại hành vi hiện tại để đổi có chủ đích (xem backend_requests.md §P1-BE-04).
        Assert.Equal(1482.75, profile.Bmr);
    }

    [DbFact]
    public async Task Saving_the_survey_again_with_the_same_choices_works_and_keeps_exactly_those_choices()
    {
        var user = await _factory.RegisterUserAsync();
        var body = Survey(allergies: new[] { 1, 2 }, conditions: new[] { 1 }, diets: new[] { 2 });

        // P1-BE-04a: lần 2 trở đi từng có nguy cơ lỗi 500 khi "xóa hết rồi thêm lại cùng khóa".
        await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey", body));
        var second = await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey", body));
        var third = await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey", body));

        Assert.Equal(new[] { 1, 2 }, second.AllergyIds);
        Assert.Equal(new[] { 1, 2 }, third.AllergyIds);
        Assert.Equal(new[] { 1 }, third.MedicalConditionIds);
        Assert.Equal(new[] { 2 }, third.DietaryPreferenceIds);
        Assert.Equal(2, third.Allergies.Count);

        var replaced = await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey",
            Survey(allergies: new[] { 2, 3 }, conditions: Array.Empty<int>(), diets: new[] { 1, 2 })));
        Assert.Equal(new[] { 2, 3 }, replaced.AllergyIds);
        Assert.Equal(new[] { "Đậu phộng (Peanuts)", "Sữa động vật (Dairy)" }, replaced.Allergies);
        Assert.Empty(replaced.MedicalConditionIds);
        Assert.Equal(new[] { 1, 2 }, replaced.DietaryPreferenceIds);

        var cleared = await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey()));
        Assert.Empty(cleared.AllergyIds);
        Assert.Empty(cleared.DietaryPreferenceIds);
    }

    [DbFact]
    public async Task Duplicate_ids_in_the_request_are_stored_once()
    {
        var user = await _factory.RegisterUserAsync();

        var profile = await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey",
            Survey(allergies: new[] { 1, 1, 2, 2 })));

        Assert.Equal(new[] { 1, 2 }, profile.AllergyIds);
    }

    [DbFact]
    public async Task Unknown_reference_ids_return_400_not_500()
    {
        var user = await _factory.RegisterUserAsync();

        var allergy = await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey(allergies: new[] { 999 }));
        var condition = await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey(conditions: new[] { 999 }));
        var diet = await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey(diets: new[] { 999 }));

        Assert.Equal(HttpStatusCode.BadRequest, allergy.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, condition.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, diet.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.GetAsync("/api/healthprofile")).StatusCode);
    }

    [DbFact]
    public async Task Weight_history_only_grows_when_the_weight_actually_changes()
    {
        var user = await _factory.RegisterUserAsync();

        await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey(weight: 70)));
        await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey(weight: 70)));
        Assert.Single((await GetWeightHistoryAsync(user.Client)).History);

        await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey(weight: 69)));
        Assert.Equal(2, (await GetWeightHistoryAsync(user.Client)).History.Count);

        await ExpectProfileAsync(await user.Client.PutJsonAsync("/api/healthprofile", new { heightCm = 170 }));
        Assert.Equal(2, (await GetWeightHistoryAsync(user.Client)).History.Count);

        var updated = await ExpectProfileAsync(await user.Client.PutJsonAsync("/api/healthprofile", new { currentWeightKg = 68 }));
        Assert.Equal(68, updated.CurrentWeightKg);
        var history = await GetWeightHistoryAsync(user.Client);
        Assert.Equal(3, history.History.Count);
        Assert.Equal(68, history.CurrentWeightKg);
    }

    [DbFact]
    public async Task Put_changes_only_the_given_fields_and_recomputes_the_metrics()
    {
        var user = await _factory.RegisterUserAsync();
        var before = await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey",
            Survey(allergies: new[] { 1 }, diets: new[] { 2 })));

        var after = await ExpectProfileAsync(await user.Client.PutJsonAsync("/api/healthprofile", new { heightCm = 165 }));

        Assert.Equal(165, after.HeightCm);
        Assert.NotEqual(before.Bmi, after.Bmi);
        Assert.NotEqual(before.Bmr, after.Bmr);
        Assert.NotEqual(before.DailyCaloriesTarget, after.DailyCaloriesTarget);
        Assert.Equal(before.CurrentWeightKg, after.CurrentWeightKg);
        Assert.Equal(before.Goal, after.Goal);
        Assert.Equal(new[] { 1 }, after.AllergyIds);
        Assert.Equal(new[] { 2 }, after.DietaryPreferenceIds);
    }

    [DbFact]
    public async Task Put_replaces_the_given_lists_and_an_empty_list_clears_them()
    {
        var user = await _factory.RegisterUserAsync();
        await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey",
            Survey(allergies: new[] { 1 }, conditions: new[] { 2 }, diets: new[] { 3 })));

        var replaced = await ExpectProfileAsync(await user.Client.PutJsonAsync("/api/healthprofile", new { allergyIds = new[] { 2, 4 } }));
        Assert.Equal(new[] { 2, 4 }, replaced.AllergyIds);
        Assert.Equal(new[] { 2 }, replaced.MedicalConditionIds);   // không gửi → giữ nguyên
        Assert.Equal(new[] { 3 }, replaced.DietaryPreferenceIds);

        var cleared = await ExpectProfileAsync(await user.Client.PutJsonAsync("/api/healthprofile", new { allergyIds = Array.Empty<int>() }));
        Assert.Empty(cleared.AllergyIds);
        Assert.Equal(new[] { 2 }, cleared.MedicalConditionIds);
    }

    [DbFact]
    public async Task Put_can_change_date_of_birth_and_age_stays_consistent()
    {
        var user = await _factory.RegisterUserAsync();
        await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey(age: 30)));
        var dob = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(-40).AddDays(-3);

        var withDob = await ExpectProfileAsync(await user.Client.PutJsonAsync("/api/healthprofile", new { dateOfBirth = dob.ToString("yyyy-MM-dd") }));
        Assert.Equal(40, withDob.Age);
        Assert.Equal(dob, withDob.DateOfBirth);

        // Gửi tuổi mâu thuẫn với ngày sinh đã lưu → ngày sinh bị bỏ, tuổi theo giá trị mới.
        var withAge = await ExpectProfileAsync(await user.Client.PutJsonAsync("/api/healthprofile", new { age = 22 }));
        Assert.Equal(22, withAge.Age);
        Assert.Null(withAge.DateOfBirth);
    }

    [DbFact]
    public async Task Put_without_a_profile_returns_404_and_invalid_values_return_400()
    {
        var user = await _factory.RegisterUserAsync();

        var missing = await user.Client.PutJsonAsync("/api/healthprofile", new { heightCm = 170 });
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);

        await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey()));
        var badHeight = await user.Client.PutJsonAsync("/api/healthprofile", new { heightCm = 10 });
        var badGoal = await user.Client.PutJsonAsync("/api/healthprofile", new { goal = "Fly" });
        var badId = await user.Client.PutJsonAsync("/api/healthprofile", new { dietaryPreferenceIds = new[] { 999 } });

        Assert.Equal(HttpStatusCode.BadRequest, badHeight.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, badGoal.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, badId.StatusCode);
    }

    [DbFact]
    public async Task Water_goal_from_the_profile_drives_the_water_endpoints()
    {
        var user = await _factory.RegisterUserAsync();
        await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey(waterGoalMl: 2500)));

        var logged = (await (await user.Client.PostJsonAsync("/api/nutritiondiary/water", new { amountMl = 500, date = "2026-07-01" }))
            .ReadEnvelopeAsync<WaterSummaryPayload>()).Data!;
        var history = (await (await user.Client.GetAsync("/api/nutritiondiary/water?date=2026-07-01"))
            .ReadEnvelopeAsync<WaterHistoryPayload>()).Data!;

        Assert.Equal(2500, logged.GoalWaterMl);
        Assert.Equal(20, logged.Percentage);
        Assert.Equal(2500, history.GoalMl);

        var changed = await ExpectProfileAsync(await user.Client.PutJsonAsync("/api/healthprofile", new { waterGoalMl = 3000 }));
        Assert.Equal(3000, changed.WaterGoalMl);
    }

    [DbFact]
    public async Task A_back_dated_weight_entry_does_not_override_the_current_weight()
    {
        var user = await _factory.RegisterUserAsync();
        await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey(weight: 70)));

        var old = await user.Client.PostJsonAsync("/api/healthprofile/weight-log",
            new { weightKg = 60, recordedAt = DateTime.UtcNow.AddDays(-30) });
        Assert.Equal(HttpStatusCode.OK, old.StatusCode);
        Assert.Equal(70, (await GetProfileAsync(user.Client)).CurrentWeightKg);

        var fresh = await user.Client.PostJsonAsync("/api/healthprofile/weight-log", new { weightKg = 68 });
        Assert.Equal(HttpStatusCode.OK, fresh.StatusCode);
        var profile = await GetProfileAsync(user.Client);
        Assert.Equal(68, profile.CurrentWeightKg);
        Assert.NotEqual(1648.75, profile.Bmr); // chỉ số được tính lại theo cân nặng mới

        var history = await GetWeightHistoryAsync(user.Client);
        Assert.Equal(3, history.History.Count);
        Assert.Equal(new[] { 60.0, 70.0, 68.0 }, history.History.Select(h => h.WeightKg));
    }

    [DbFact]
    public async Task Weight_log_accepts_a_date_without_a_time_zone_and_validates_the_range()
    {
        var user = await _factory.RegisterUserAsync();
        await ExpectProfileAsync(await user.Client.PostJsonAsync("/api/healthprofile/survey", Survey()));

        var dateOnly = await user.Client.PostJsonAsync("/api/healthprofile/weight-log", new { weightKg = 69.5, recordedAt = "2026-09-26" });
        var tooLight = await user.Client.PostJsonAsync("/api/healthprofile/weight-log", new { weightKg = 5 });
        var future = await user.Client.PostJsonAsync("/api/healthprofile/weight-log", new { weightKg = 70, recordedAt = "2999-01-01T00:00:00Z" });

        Assert.Equal(HttpStatusCode.OK, dateOnly.StatusCode);   // trước đây: DateTime Unspecified làm lỗi 500 khi ghi Npgsql
        Assert.Equal(HttpStatusCode.BadRequest, tooLight.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, future.StatusCode);
    }

    [DbFact]
    public async Task Weight_log_without_a_profile_is_rejected()
    {
        var user = await _factory.RegisterUserAsync();

        var response = await user.Client.PostJsonAsync("/api/healthprofile/weight-log", new { weightKg = 70 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [DbFact]
    public async Task Meta_lists_expose_unique_stable_codes_including_the_added_catalog_entries()
    {
        var client = _factory.CreateClient();

        var allergies = (await (await client.GetAsync("/api/meta/allergies")).ReadEnvelopeAsync<List<MetaItemPayload>>()).Data!;
        var conditions = (await (await client.GetAsync("/api/meta/medical-conditions")).ReadEnvelopeAsync<List<MetaItemPayload>>()).Data!;
        var tags = (await (await client.GetAsync("/api/meta/tags")).ReadEnvelopeAsync<List<MetaItemPayload>>()).Data!;

        Assert.Equal(
            new[] { "seafood", "peanut", "dairy", "egg", "gluten", "soy", "treeNut", "sesame" },
            allergies.OrderBy(a => a.Id).Select(a => a.Code));
        Assert.Equal(new[] { "diabetes", "gout", "hypertension", "dyslipidemia" }, conditions.OrderBy(c => c.Id).Select(c => c.Code));
        Assert.Contains(tags, t => t.Code == "lowCarb");
        Assert.Contains(tags, t => t.Code == "vegetarian");
        Assert.Equal(tags.Count, tags.Select(t => t.Code).Distinct().Count());
        // Id đã phát hành không đổi.
        Assert.Equal("seafood", allergies.Single(a => a.Id == 1).Code);
        Assert.Equal("keto", tags.Single(t => t.Id == 2).Code);
    }
}
