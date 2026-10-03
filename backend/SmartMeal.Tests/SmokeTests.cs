using System.Net;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>Khởi động API thật trên PostgreSQL mới: kiểm tra migration + seed + xác thực hoạt động.</summary>
public class SmokeTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public SmokeTests(ApiFactory factory) => _factory = factory;

    [DbFact]
    public async Task Migration_and_seed_provide_reference_data()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/meta/allergies");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var envelope = await response.ReadEnvelopeAsync<List<Dictionary<string, object?>>>();
        Assert.True(envelope.Success);
        Assert.True(envelope.Data!.Count >= 6);
    }

    [DbFact]
    public async Task Registered_user_can_read_own_profile_with_the_issued_token()
    {
        var user = await _factory.RegisterUserAsync();

        var response = await user.Client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var me = (await response.ReadEnvelopeAsync<UserPayload>()).Data!;
        Assert.Equal(user.Id, me.Id);
        Assert.Equal(user.Email, me.Email);
    }

    [DbFact]
    public async Task Protected_endpoint_without_token_is_rejected()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/nutritiondiary/daily");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
