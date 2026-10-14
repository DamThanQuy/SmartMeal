using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>P2-BE-07: XP/cấp độ không cộng trùng (BR-202), nhiệm vụ ngày, thử thách có tiến độ, huy hiệu, trang phục.</summary>
public class GamificationTests : IClassFixture<ApiFactory>
{
    // "Hôm nay" của client; server chấp nhận ±1 ngày quanh ngày UTC nên test không vỡ khi chạy sát nửa đêm.
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

    private readonly ApiFactory _factory;

    public GamificationTests(ApiFactory factory) => _factory = factory;

    private static string Iso(DateOnly d) => d.ToString("yyyy-MM-dd");
    private static string Q(DateOnly? date = null) => $"?date={Iso(date ?? Today)}";

    private static async Task<PetPayload> PetAsync(HttpClient client, DateOnly? date = null)
    {
        var response = await client.GetAsync("/api/gamification/pet" + Q(date));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<PetPayload>()).Data!;
    }

    private static async Task<List<ChallengePayload>> ChallengesAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/gamification/challenges" + Q());
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<List<ChallengePayload>>()).Data!;
    }

    private static async Task<BadgesPayload> BadgesAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/gamification/badges" + Q());
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<BadgesPayload>()).Data!;
    }

    private static async Task<ChallengePayload> JoinAsync(HttpClient client, Guid id, DateOnly? date = null)
    {
        var response = await client.PostAsync($"/api/gamification/challenges/{id}/join" + Q(date), null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<ChallengePayload>()).Data!;
    }

    private static async Task LogMealAsync(HttpClient client, DateOnly date, string mealType, string name, double protein = 10, string method = "Manual")
    {
        var response = await client.PostJsonAsync("/api/nutritiondiary/log", new
        {
            logDate = Iso(date), mealType, foodName = name, servingSize = 100, unit = "g", calories = 200, carbsGrams = 20,
            fatGrams = 5, proteinGrams = protein, logMethod = method
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task LogWaterAsync(HttpClient client, DateOnly date, int ml)
    {
        var response = await client.PostJsonAsync("/api/nutritiondiary/water", new { amountMl = ml, date = Iso(date) });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task<double> SetSurveyAsync(HttpClient client)
    {
        var response = await client.PostJsonAsync("/api/healthprofile/survey", new
        {
            gender = "Male", age = 30, heightCm = 175, currentWeightKg = 70, targetWeightKg = 65, activityLevel = "Moderate",
            goal = "LoseWeight", allergyIds = Array.Empty<int>(), medicalConditionIds = Array.Empty<int>(), dietaryPreferenceIds = Array.Empty<int>()
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<HealthProfilePayload>()).Data!.DailyProteinTargetGrams;
    }

    private static async Task<Guid> AddChallengeAsync(ApiFactory factory, string title, string category, int target, int days, int reward)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var challenge = new Challenge { Title = title, Description = title, Category = category, TargetValuePerDay = target, DurationDays = days, RewardExp = reward, RewardBadge = "Test" };
        db.Challenges.Add(challenge);
        await db.SaveChangesAsync();
        return challenge.Id;
    }

    // ───────────────────────────── Pet, XP, nhiệm vụ ─────────────────────────────

    [DbFact]
    public async Task A_new_user_starts_at_level_one_with_no_xp_and_no_streak()
    {
        var user = await _factory.RegisterUserAsync();

        var pet = await PetAsync(user.Client);
        var streak = (await (await user.Client.GetAsync("/api/gamification/streak" + Q())).ReadEnvelopeAsync<StreakPayload>()).Data!;

        Assert.Equal("Bé Mầm", pet.PetName);
        Assert.Equal(1, pet.Level);
        Assert.Equal(0, pet.TotalXp);
        Assert.Equal(0, pet.XpIntoLevel);
        Assert.Equal(500, pet.XpPerLevel);
        Assert.Equal(0, pet.Exp);
        Assert.Equal(500, pet.NextLevelExp);
        Assert.Equal("Baby", pet.Stage);
        Assert.Equal("Hungry", pet.Mood);
        Assert.Equal("Default", pet.CurrentOutfit);
        Assert.Equal(new[] { "breakfast", "protein", "water" }, pet.Tasks.Select(t => t.Id));
        Assert.All(pet.Tasks, t => Assert.False(t.Completed));

        // Trước đây streak luôn bị ép tối thiểu 1 dù chưa ghi gì.
        Assert.Equal(0, streak.CurrentStreak);
        Assert.Equal(0, streak.LongestStreak);
        Assert.Equal(0, streak.TotalActiveDays);
        Assert.False(streak.HasLoggedToday);
        Assert.Equal(7, streak.RecentActivity.Count);
        Assert.Equal(Today, streak.RecentActivity[^1].Date);
        Assert.DoesNotContain(streak.RecentActivity, d => d.HasLogged);
    }

    [DbFact]
    public async Task Finishing_the_daily_tasks_awards_xp_once_each_and_never_twice()
    {
        var user = await _factory.RegisterUserAsync();
        var proteinTarget = await SetSurveyAsync(user.Client);

        await LogMealAsync(user.Client, Today, "Breakfast", "Bánh mì", protein: 5);
        var afterBreakfast = await PetAsync(user.Client);
        Assert.Equal(10, afterBreakfast.TotalXp);
        Assert.True(afterBreakfast.Tasks.Single(t => t.Id == "breakfast").Completed);
        Assert.False(afterBreakfast.Tasks.Single(t => t.Id == "protein").Completed);
        Assert.Equal("Happy", afterBreakfast.Mood);

        Assert.Equal(10, (await PetAsync(user.Client)).TotalXp); // mở lại màn: không cộng thêm

        await LogMealAsync(user.Client, Today, "Lunch", "Ức gà", protein: proteinTarget + 1);
        await LogWaterAsync(user.Client, Today, 2000);
        var done = await PetAsync(user.Client);

        Assert.Equal(40, done.TotalXp); // 10 + 20 + 10
        Assert.All(done.Tasks, t => Assert.True(t.Completed));
        Assert.Equal(40, done.XpIntoLevel);
        Assert.Equal(1, done.Level);
        Assert.Equal(40, (await PetAsync(user.Client)).TotalXp);
    }

    [DbFact]
    public async Task Concurrent_reads_never_award_the_same_event_twice()
    {
        var user = await _factory.RegisterUserAsync();
        await LogMealAsync(user.Client, Today, "Breakfast", "Trứng");
        await LogWaterAsync(user.Client, Today, 2500);

        var pets = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => PetAsync(user.Client)));

        Assert.All(pets, p => Assert.InRange(p.TotalXp, 0, 20));
        Assert.Equal(20, (await PetAsync(user.Client)).TotalXp);
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(2, await db.XpEvents.CountAsync(e => e.UserId == user.Id));
        Assert.Equal(1, await db.HealthPets.CountAsync(p => p.UserId == user.Id));
    }

    [DbFact]
    public async Task Data_for_far_away_dates_never_earns_xp_and_a_bad_date_is_rejected()
    {
        var user = await _factory.RegisterUserAsync();
        await LogMealAsync(user.Client, new DateOnly(2020, 1, 1), "Breakfast", "Bánh cũ");

        var pet = await PetAsync(user.Client, new DateOnly(2020, 1, 1)); // bị đưa về ≈ hôm nay, nên ngày 2020 không được tính
        var bad = await user.Client.GetAsync("/api/gamification/pet?date=hôm-nay");

        Assert.Equal(0, pet.TotalXp);
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [DbFact]
    public async Task Gamification_needs_a_login()
    {
        var anonymous = _factory.CreateClient();

        foreach (var path in new[] { "pet", "streak", "challenges", "badges" })
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"/api/gamification/{path}")).StatusCode);
        }

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsync($"/api/gamification/challenges/{Guid.NewGuid()}/join", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsync("/api/gamification/costumes/straw-hat/equip", null)).StatusCode);
    }

    // ───────────────────────────── Streak ─────────────────────────────

    [DbFact]
    public async Task The_streak_counts_consecutive_logged_days_and_keeps_the_longest_run()
    {
        var user = await _factory.RegisterUserAsync();
        foreach (var offset in new[] { 0, 1, 2 })
            await LogMealAsync(user.Client, Today.AddDays(-offset), "Lunch", $"Món {offset}");
        await LogMealAsync(user.Client, Today.AddDays(-6), "Lunch", "Cách quãng");

        var streak = (await (await user.Client.GetAsync("/api/gamification/streak" + Q())).ReadEnvelopeAsync<StreakPayload>()).Data!;

        Assert.Equal(3, streak.CurrentStreak);
        Assert.Equal(3, streak.LongestStreak);
        Assert.Equal(4, streak.TotalActiveDays);
        Assert.True(streak.HasLoggedToday);
        // 7 ngày kết thúc hôm nay: T−6 (có ghi), T−5…T−3 (không), T−2, T−1, hôm nay (có ghi).
        Assert.Equal(new[] { true, false, false, false, true, true, true }, streak.RecentActivity.Select(d => d.HasLogged));
    }

    [DbFact]
    public async Task A_streak_survives_until_the_end_of_today_without_a_log()
    {
        var user = await _factory.RegisterUserAsync();
        await LogMealAsync(user.Client, Today.AddDays(-1), "Lunch", "Hôm qua");
        await LogMealAsync(user.Client, Today.AddDays(-2), "Lunch", "Hôm kia");

        var streak = (await (await user.Client.GetAsync("/api/gamification/streak" + Q())).ReadEnvelopeAsync<StreakPayload>()).Data!;

        Assert.Equal(2, streak.CurrentStreak);
        Assert.False(streak.HasLoggedToday);
    }

    // ───────────────────────────── Thử thách ─────────────────────────────

    [DbFact]
    public async Task Joining_a_challenge_starts_its_window_today_and_is_idempotent()
    {
        var user = await _factory.RegisterUserAsync();
        var list = await ChallengesAsync(user.Client);
        Assert.Equal(3, list.Count);
        Assert.DoesNotContain(list, c => c.IsJoined);
        var water = list.Single(c => c.Category == "DrinkWater");
        Assert.Equal(2000, water.TargetValuePerDay);
        Assert.Equal(7, water.DurationDays);
        Assert.Equal("EatClean", list.Single(c => c.Title.Contains("Eat Clean")).Category);
        Assert.Equal(10000, list.Single(c => c.Category == "Exercise").TargetValuePerDay);
        Assert.Null(water.StartDate);

        var joined = await JoinAsync(user.Client, water.Id);
        Assert.True(joined.IsJoined);
        Assert.Equal(Today, joined.StartDate);
        Assert.Equal(Today.AddDays(6), joined.EndDate);
        Assert.Equal(1, joined.CurrentDay);
        Assert.Equal(0, joined.CompletedDays); // trước đây bị đặt cứng là 1 ngay khi tham gia
        Assert.False(joined.IsCompleted);
        Assert.False(joined.IsExpired);

        var again = await JoinAsync(user.Client, water.Id, Today.AddDays(1));
        Assert.Equal(Today, again.StartDate); // tham gia lại không dời khung
        Assert.Single(await ChallengesAsync(user.Client), c => c.IsJoined);

        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.PostAsync($"/api/gamification/challenges/{Guid.NewGuid()}/join", null)).StatusCode);
    }

    [DbFact]
    public async Task Parallel_joins_create_a_single_record()
    {
        var user = await _factory.RegisterUserAsync();
        var steps = (await ChallengesAsync(user.Client)).Single(c => c.Category == "Exercise");

        var responses = await Task.WhenAll(Enumerable.Range(0, 6)
            .Select(_ => user.Client.PostAsync($"/api/gamification/challenges/{steps.Id}/join" + Q(), null)));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(1, await db.UserChallenges.CountAsync(uc => uc.UserId == user.Id));
    }

    [DbFact]
    public async Task Water_eat_clean_and_step_challenges_count_the_days_that_meet_their_goal()
    {
        var user = await _factory.RegisterUserAsync();
        var list = await ChallengesAsync(user.Client);
        var water = list.Single(c => c.Category == "DrinkWater");
        var clean = list.Single(c => c.Category == "EatClean");
        var steps = list.Single(c => c.Category == "Exercise");
        foreach (var c in new[] { water, clean, steps }) await JoinAsync(user.Client, c.Id);

        await LogWaterAsync(user.Client, Today, 1500);
        await LogMealAsync(user.Client, Today, "Breakfast", "Sáng");
        await LogMealAsync(user.Client, Today, "Lunch", "Trưa");
        var halfway = (await ChallengesAsync(user.Client)).ToDictionary(c => c.Category);
        Assert.Equal(0, halfway["DrinkWater"].CompletedDays); // 1500 < 2000 ml
        Assert.Equal(0, halfway["EatClean"].CompletedDays);   // mới 2/3 nhóm bữa

        await LogWaterAsync(user.Client, Today, 600);
        await LogMealAsync(user.Client, Today, "Dinner", "Tối");
        var sync = await user.Client.PostJsonAsync("/api/health-sync/steps-and-calories",
            new { date = Iso(Today), source = "GoogleFit", steps = 12000, burnedCalories = 300 });
        Assert.Equal(HttpStatusCode.OK, sync.StatusCode);

        var done = (await ChallengesAsync(user.Client)).ToDictionary(c => c.Category);
        Assert.Equal(1, done["DrinkWater"].CompletedDays);
        Assert.Equal(1, done["EatClean"].CompletedDays);
        Assert.Equal(1, done["Exercise"].CompletedDays);
        Assert.All(done.Values, c => Assert.False(c.IsCompleted));

        // Đồng bộ lại số bước thấp hơn thì ngày đó không còn đạt.
        await user.Client.PostJsonAsync("/api/health-sync/steps-and-calories", new { date = Iso(Today), source = "GoogleFit", steps = 9000, burnedCalories = 300 });
        Assert.Equal(0, (await ChallengesAsync(user.Client)).Single(c => c.Category == "Exercise").CompletedDays);
    }

    [DbFact]
    public async Task Completing_a_challenge_awards_its_xp_exactly_once_and_unlocks_the_backpack()
    {
        await using var factory = new ApiFactory();
        var challengeId = await AddChallengeAsync(factory, "Hai ngày uống nước", "DrinkWater", 1500, days: 2, reward: 600);
        var user = await factory.RegisterUserAsync();
        var yesterday = Today.AddDays(-1);

        await JoinAsync(user.Client, challengeId, yesterday);
        await LogWaterAsync(user.Client, yesterday, 1500);
        var midway = (await ChallengesAsync(user.Client)).Single(c => c.Id == challengeId);
        Assert.Equal(1, midway.CompletedDays);
        Assert.False(midway.IsCompleted);
        Assert.Equal(2, midway.CurrentDay);
        Assert.Equal(0, (await PetAsync(user.Client)).TotalXp);

        await LogWaterAsync(user.Client, Today, 1500);
        var finished = (await ChallengesAsync(user.Client)).Single(c => c.Id == challengeId);
        Assert.Equal(2, finished.CompletedDays);
        Assert.True(finished.IsCompleted);

        var pet = await PetAsync(user.Client);
        Assert.Equal(600, pet.TotalXp);
        Assert.Equal(2, pet.Level);          // 600 XP = cấp 2 + 100
        Assert.Equal(100, pet.XpIntoLevel);

        // Đánh giá lại và tham gia lại không thưởng lần nữa (BR-212).
        await ChallengesAsync(user.Client);
        await JoinAsync(user.Client, challengeId);
        Assert.Equal(600, (await PetAsync(user.Client)).TotalXp);

        var badges = await BadgesAsync(user.Client);
        Assert.True(badges.Costumes.Single(c => c.Id == "backpack").Unlocked);
    }

    [DbFact]
    public async Task An_expired_unfinished_challenge_shows_as_expired_and_joining_again_restarts_the_window()
    {
        var user = await _factory.RegisterUserAsync();
        var water = (await ChallengesAsync(user.Client)).Single(c => c.Category == "DrinkWater");
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.UserChallenges.Add(new UserChallenge { UserId = user.Id, ChallengeId = water.Id, StartDate = Today.AddDays(-30), CompletedDays = 3 });
            await db.SaveChangesAsync();
        }

        var expired = (await ChallengesAsync(user.Client)).Single(c => c.Id == water.Id);
        Assert.True(expired.IsJoined);
        Assert.True(expired.IsExpired);
        Assert.False(expired.IsCompleted);
        Assert.Equal(7, expired.CurrentDay);

        var restarted = await JoinAsync(user.Client, water.Id);
        Assert.Equal(Today, restarted.StartDate);
        Assert.Equal(0, restarted.CompletedDays);
        Assert.False(restarted.IsExpired);
    }

    // ───────────────────────────── Huy hiệu & trang phục ─────────────────────────────

    [DbFact]
    public async Task A_new_user_has_every_badge_and_costume_locked()
    {
        var user = await _factory.RegisterUserAsync();

        var badges = await BadgesAsync(user.Client);

        Assert.Equal(9, badges.TotalBadgeCount);
        Assert.Equal(0, badges.UnlockedBadgeCount);
        Assert.Equal(
            new[] { "first-log", "streak-3", "hydrated", "streak-7", "eat-clean-7", "grocery-shopper", "ai-snap-10", "protein-goal", "resilient-30" },
            badges.Badges.Select(b => b.Id));
        Assert.All(badges.Badges, b => Assert.Null(b.UnlockedAt));
        Assert.Equal(new[] { "straw-hat", "sunglasses", "green-scarf", "backpack" }, badges.Costumes.Select(c => c.Id));
        Assert.All(badges.Costumes, c => { Assert.False(c.Unlocked); Assert.False(c.Equipped); });
        Assert.Equal(1, badges.Level);
        Assert.Equal(0, badges.StreakDays);
    }

    [DbFact]
    public async Task Badges_unlock_from_real_activity_and_stay_unlocked()
    {
        var user = await _factory.RegisterUserAsync();
        foreach (var offset in new[] { 0, 1, 2 })
            await LogMealAsync(user.Client, Today.AddDays(-offset), "Lunch", $"Món {offset}");
        await LogWaterAsync(user.Client, Today, 2000);
        for (var i = 0; i < 10; i++)
            await LogMealAsync(user.Client, Today, "Snack", $"Ảnh {i}", method: "AiImage");

        var badges = await BadgesAsync(user.Client);

        var unlocked = badges.Badges.Where(b => b.Unlocked).Select(b => b.Id).ToHashSet();
        Assert.Equal(new[] { "first-log", "streak-3", "hydrated", "ai-snap-10" }.ToHashSet(), unlocked);
        Assert.Equal(4, badges.UnlockedBadgeCount);
        Assert.All(badges.Badges.Where(b => b.Unlocked), b => Assert.NotNull(b.UnlockedAt));
        Assert.Equal(3, badges.StreakDays);

        // Xóa hết món đã ghi sau đó không làm mất huy hiệu đã mở.
        var daily = (await (await user.Client.GetAsync($"/api/nutritiondiary/daily?date={Iso(Today)}")).ReadEnvelopeAsync<DailyPayload>()).Data!;
        foreach (var item in daily.Meals.SelectMany(m => m.Items))
            Assert.Equal(HttpStatusCode.OK, (await user.Client.DeleteAsync($"/api/nutritiondiary/items/{item.Id}")).StatusCode);

        var after = await BadgesAsync(user.Client);
        Assert.Equal(unlocked, after.Badges.Where(b => b.Unlocked).Select(b => b.Id).ToHashSet());
    }

    [DbFact]
    public async Task The_protein_badge_needs_five_days_on_target()
    {
        var user = await _factory.RegisterUserAsync();
        var target = await SetSurveyAsync(user.Client);
        for (var offset = 0; offset < 4; offset++)
            await LogMealAsync(user.Client, Today.AddDays(-offset), "Lunch", $"Đạm {offset}", protein: target + 1);

        Assert.False((await BadgesAsync(user.Client)).Badges.Single(b => b.Id == "protein-goal").Unlocked);

        await LogMealAsync(user.Client, Today.AddDays(-4), "Lunch", "Đạm 4", protein: target + 1);

        Assert.True((await BadgesAsync(user.Client)).Badges.Single(b => b.Id == "protein-goal").Unlocked);
    }

    [DbFact]
    public async Task Ticking_a_grocery_item_earns_the_shopper_badge_even_if_the_list_is_cleared_straight_away()
    {
        var user = await _factory.RegisterUserAsync();
        var add = await user.Client.PostJsonAsync("/api/grocery/items", new { ingredientName = "Hành", amount = 1, unit = "bó" });
        var item = (await add.ReadEnvelopeAsync<GroceryItemPayload>()).Data!;
        Assert.False((await BadgesAsync(user.Client)).Badges.Single(b => b.Id == "grocery-shopper").Unlocked);

        await user.Client.PatchAsJsonAsync($"/api/grocery/items/{item.Id}/check", new { isChecked = true }, ApiTestHelpers.Json);
        await user.Client.DeleteAsync("/api/grocery/clear-checked");

        Assert.True((await BadgesAsync(user.Client)).Badges.Single(b => b.Id == "grocery-shopper").Unlocked);
    }

    [DbFact]
    public async Task Costumes_can_only_be_worn_once_unlocked_and_can_be_taken_off()
    {
        var user = await _factory.RegisterUserAsync();
        await PetAsync(user.Client); // tạo pet

        var locked = await user.Client.PostAsync("/api/gamification/costumes/straw-hat/equip" + Q(), null);
        Assert.Equal(HttpStatusCode.BadRequest, locked.StatusCode);
        Assert.Contains("chưa mở khóa", (await locked.ReadEnvelopeAsync<object>()).Message);
        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.PostAsync("/api/gamification/costumes/crown/equip" + Q(), null)).StatusCode);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.HealthPets.Where(p => p.UserId == user.Id).ExecuteUpdateAsync(s => s.SetProperty(p => p.TotalXp, 1000)); // cấp 3
        }

        var worn = await user.Client.PostAsync("/api/gamification/costumes/straw-hat/equip" + Q(), null);
        Assert.Equal(HttpStatusCode.OK, worn.StatusCode);
        var summary = (await worn.ReadEnvelopeAsync<BadgesPayload>()).Data!;
        Assert.Equal(3, summary.Level);
        Assert.True(summary.Costumes.Single(c => c.Id == "straw-hat").Equipped);
        Assert.False(summary.Costumes.Single(c => c.Id == "sunglasses").Unlocked); // cấp 6 mới mở
        Assert.Equal("straw-hat", (await PetAsync(user.Client)).CurrentOutfit);
        Assert.Equal("Child", (await PetAsync(user.Client)).Stage);

        var off = await user.Client.DeleteAsync("/api/gamification/costumes/equipped" + Q());
        Assert.Equal(HttpStatusCode.OK, off.StatusCode);
        Assert.Equal("Default", (await PetAsync(user.Client)).CurrentOutfit);
        Assert.DoesNotContain((await BadgesAsync(user.Client)).Costumes, c => c.Equipped);
    }

    [DbFact]
    public async Task Deleting_my_data_resets_xp_badges_and_challenge_progress()
    {
        var user = await _factory.RegisterUserAsync();
        await LogMealAsync(user.Client, Today, "Breakfast", "Sáng");
        Assert.Equal(10, (await PetAsync(user.Client)).TotalXp);
        var water = (await ChallengesAsync(user.Client)).Single(c => c.Category == "DrinkWater");
        await JoinAsync(user.Client, water.Id);

        Assert.Equal(HttpStatusCode.OK, (await user.Client.DeleteAsync("/api/me/data")).StatusCode);

        Assert.Equal(0, (await PetAsync(user.Client)).TotalXp);
        Assert.DoesNotContain(await ChallengesAsync(user.Client), c => c.IsJoined);
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(0, await db.XpEvents.CountAsync(e => e.UserId == user.Id));
    }
}
