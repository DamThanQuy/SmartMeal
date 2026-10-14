using System.Net;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>Tài khoản dùng thử có mật khẩu đã biết: chỉ tồn tại khi được bật rõ ràng (Development), không bao giờ ở môi trường khác.</summary>
public class SeedTests
{
    private static async Task<HttpResponseMessage> LoginAsync(HttpClient client, string password) =>
        await client.PostJsonAsync("/api/auth/login", new { email = DbInitializer.DevAccountEmail, password });

    [DbFact]
    public async Task The_dev_account_is_not_created_outside_development()
    {
        await using var factory = new ApiFactory(); // môi trường Testing

        var response = await LoginAsync(factory.CreateClient(), DbInitializer.DefaultDevPassword);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [DbFact]
    public async Task The_dev_account_is_created_once_with_a_real_profile_when_enabled()
    {
        await using var factory = new ApiFactory();
        var anonymous = factory.CreateClient(); // khởi động API (migration + seed không có tài khoản dev)

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await DbInitializer.SeedAsync(db, seedDevAccount: true, devAccountPassword: "Dev-Passw0rd!");
            await DbInitializer.SeedAsync(db, seedDevAccount: true, devAccountPassword: "Changed-Passw0rd!"); // không ghi đè
        }

        var login = await LoginAsync(anonymous, "Dev-Passw0rd!");
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(anonymous, "Changed-Passw0rd!")).StatusCode);

        var auth = (await login.ReadEnvelopeAsync<AuthPayload>()).Data!;
        Assert.True(auth.User.IsPro);
        Assert.Equal("Premium", auth.User.SubscriptionStatus);
        Assert.NotNull(auth.User.ProExpiresAt);
        Assert.True(auth.User.ProExpiresAt > DateTime.UtcNow.AddDays(300));
        Assert.True(auth.User.HasCompletedSurvey);

        anonymous.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.Token);
        var profile = (await (await anonymous.GetAsync("/api/healthprofile")).ReadEnvelopeAsync<HealthProfilePayload>()).Data!;
        Assert.Equal(22.2, profile.Bmi);
        Assert.True(profile.DailyCaloriesTarget >= 1200);
        Assert.True(profile.DailyProteinTargetGrams > 0);
        Assert.Equal("LoseWeight", profile.Goal);
    }
}
