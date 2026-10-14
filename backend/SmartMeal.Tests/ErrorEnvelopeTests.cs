using System.Net;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Foods;
using SmartMeal.Application.Services;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>P1-BE-13: mọi lỗi (400/401/404/405/500) đều có cùng một dạng body envelope ApiResponse.</summary>
public class ErrorEnvelopeTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public ErrorEnvelopeTests(ApiFactory factory) => _factory = factory;

    private static async Task<ApiEnvelope<object>> AssertEnvelopeAsync(HttpResponseMessage response, HttpStatusCode expected)
    {
        Assert.Equal(expected, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        var envelope = await response.ReadEnvelopeAsync<object>();
        Assert.False(envelope.Success);
        Assert.False(string.IsNullOrWhiteSpace(envelope.Message));
        return envelope;
    }

    [DbFact]
    public async Task Missing_token_returns_401_envelope_instead_of_empty_body()
    {
        var response = await _factory.CreateClient().GetAsync("/api/nutritiondiary/daily");

        await AssertEnvelopeAsync(response, HttpStatusCode.Unauthorized);
        Assert.Contains("Bearer", response.Headers.WwwAuthenticate.ToString());
    }

    [DbFact]
    public async Task Invalid_token_returns_401_envelope()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "not.a.jwt");

        var response = await client.GetAsync("/api/auth/me");

        await AssertEnvelopeAsync(response, HttpStatusCode.Unauthorized);
    }

    [DbFact]
    public async Task Unknown_route_returns_404_envelope()
    {
        var response = await _factory.CreateClient().GetAsync("/api/does-not-exist");

        await AssertEnvelopeAsync(response, HttpStatusCode.NotFound);
    }

    [DbFact]
    public async Task Wrong_http_method_returns_405_envelope()
    {
        var response = await _factory.CreateClient().PutJsonAsync("/api/foods", new { });

        await AssertEnvelopeAsync(response, HttpStatusCode.MethodNotAllowed);
    }

    [DbFact]
    public async Task Invalid_register_body_returns_400_with_vietnamese_error_list()
    {
        var response = await _factory.CreateClient().PostJsonAsync(
            "/api/auth/register",
            new { email = "not-an-email", password = "123", fullName = "" });

        var envelope = await AssertEnvelopeAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("Dữ liệu không hợp lệ.", envelope.Message);
        Assert.NotNull(envelope.Errors);
        Assert.Contains(envelope.Errors!, e => e.Contains("Email không đúng định dạng"));
        Assert.Contains(envelope.Errors!, e => e.Contains("Mật khẩu phải từ 8 đến 128 ký tự"));
        Assert.Contains(envelope.Errors!, e => e.Contains("Họ tên"));
    }

    [DbFact]
    public async Task Malformed_json_returns_400_envelope_without_internal_details()
    {
        var content = new StringContent("{ this is not json", Encoding.UTF8, "application/json");

        var response = await _factory.CreateClient().PostAsync("/api/auth/login", content);

        var envelope = await AssertEnvelopeAsync(response, HttpStatusCode.BadRequest);
        var raw = string.Join(' ', envelope.Errors ?? new List<string>()) + envelope.Message;
        Assert.DoesNotContain("System.Text.Json", raw);
        Assert.DoesNotContain("LineNumber", raw);
    }

    [DbFact]
    public async Task Wrong_password_still_returns_401_with_message()
    {
        var user = await _factory.RegisterUserAsync();

        var response = await _factory.CreateClient().PostJsonAsync(
            "/api/auth/login",
            new { email = user.Email, password = "wrong-password" });

        var envelope = await AssertEnvelopeAsync(response, HttpStatusCode.Unauthorized);
        Assert.Contains("không chính xác", envelope.Message);
    }

    [DbFact]
    public async Task Unhandled_exception_returns_500_envelope_with_trace_id_and_no_stack_trace()
    {
        using var factory = _factory.WithWebHostBuilder(builder =>
            builder.ConfigureTestServices(services => services.AddScoped<IFoodService, ThrowingFoodService>()));

        var response = await factory.CreateClient().GetAsync("/api/foods");

        var envelope = await AssertEnvelopeAsync(response, HttpStatusCode.InternalServerError);
        Assert.Contains(envelope.Errors!, e => e.StartsWith("traceId:"));
        var raw = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("secret internal detail", raw);
        Assert.DoesNotContain("InvalidOperationException", raw);
        Assert.DoesNotContain(" at SmartMeal", raw);
    }

    private sealed class ThrowingFoodService : IFoodService
    {
        private static Exception Boom() => new InvalidOperationException("secret internal detail");

        public Task<ApiResponse<PagedResult<FoodItemDto>>> GetFoodsAsync(FoodQuery query, Guid? userId) => throw Boom();
        public Task<ApiResponse<FoodItemDto>> GetFoodByIdAsync(Guid id, Guid? userId) => throw Boom();
        public Task<ApiResponse<FoodItemDto>> GetFoodByBarcodeAsync(string barcode, Guid? userId) => throw Boom();
        public Task<ApiResponse<FoodItemDto>> CreateFoodAsync(Guid userId, CreateFoodRequestDto dto) => throw Boom();
        public Task<ApiResponse<bool>> DeleteFoodAsync(Guid userId, Guid id) => throw Boom();
        public Task<ApiResponse<FoodFavoriteDto>> SetFavoriteAsync(Guid userId, Guid id, bool isFavorite) => throw Boom();
    }
}
