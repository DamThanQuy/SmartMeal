using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Controllers;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Services;

namespace SmartMeal.Tests;

public sealed class AuthContractTests
{
    [Fact]
    public void UserEmailIndex_IsUnique()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql("Host=localhost;Database=smartmeal_test_model;Username=test;Password=test")
            .Options;

        using var db = new ApplicationDbContext(options);
        var emailIndexes = db.Model.FindEntityType(typeof(SmartMeal.Domain.Entities.User))!
            .GetIndexes()
            .Where(index => index.Properties.Any(property => property.Name == nameof(SmartMeal.Domain.Entities.User.Email)))
            .ToArray();

        Assert.Contains(emailIndexes, index => index.IsUnique);

        var googleIdIndexes = db.Model.FindEntityType(typeof(User))!
            .GetIndexes()
            .Where(index => index.Properties.Any(property => property.Name == nameof(User.GoogleId)))
            .ToArray();
        Assert.Contains(googleIdIndexes, index => index.IsUnique);
    }

    [Fact]
    public void AuthResponse_UsesCamelCaseContract_AndDoesNotAssumeRefreshToken()
    {
        var response = ApiResponse<AuthResponseDto>.Ok(new AuthResponseDto
        {
            Token = "jwt-test",
            ExpiresAt = DateTime.Parse("2026-10-14T12:00:00Z").ToUniversalTime(),
            User = new UserDto
            {
                Id = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6"),
                Email = "user@example.com",
                FullName = "Test User",
                IsPro = false,
                Role = "User",
                HasCompletedSurvey = false
            }
        });

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        Assert.True(root.GetProperty("success").GetBoolean());
        var data = root.GetProperty("data");
        Assert.Equal("jwt-test", data.GetProperty("token").GetString());
        Assert.True(data.TryGetProperty("expiresAt", out _));
        Assert.True(data.TryGetProperty("user", out _));
        Assert.False(data.TryGetProperty("refreshToken", out _));
        Assert.False(data.TryGetProperty("refreshTokenExpiresAt", out _));
    }

    [Fact]
    public void FailedApiResponse_UsesStandardFailureEnvelope()
    {
        var response = ApiResponse<AuthResponseDto>.Fail("Google authentication failed.");
        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        Assert.False(root.GetProperty("success").GetBoolean());
        Assert.Equal("Google authentication failed.", root.GetProperty("message").GetString());
        Assert.Equal(JsonValueKind.Null, root.GetProperty("data").ValueKind);
    }

    [Fact]
    public async Task GoogleValidator_Returns503_WhenClientIdIsMissing()
    {
        var validator = new GoogleIdTokenValidator(new ConfigurationBuilder().Build());
        var exception = await Assert.ThrowsAsync<GoogleAuthException>(() => validator.ValidateAsync("some-token"));
        Assert.Equal(503, exception.StatusCode);
    }

    [Fact]
    public async Task GoogleValidator_Returns400_WhenTokenIsEmpty()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Google:ClientId"] = "test-client-id"
        }).Build();
        var validator = new GoogleIdTokenValidator(configuration);
        var exception = await Assert.ThrowsAsync<GoogleAuthException>(() => validator.ValidateAsync(" "));
        Assert.Equal(400, exception.StatusCode);
    }

    [Fact]
    public async Task GoogleValidator_Returns401_WhenTokenIsMalformed()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Google:ClientId"] = "test-client-id.apps.googleusercontent.com"
        }).Build();
        var validator = new GoogleIdTokenValidator(configuration);
        var exception = await Assert.ThrowsAsync<GoogleAuthException>(() => validator.ValidateAsync("not.a.valid.jwt"));
        Assert.Equal(401, exception.StatusCode);
    }

    [Fact]
    public async Task GoogleController_MapsAccountConflictTo409()
    {
        var controller = new AuthController(new ThrowingAuthService(new GoogleAuthException(409, "Account conflict.")));

        var action = await controller.GoogleLogin(new GoogleAuthRequestDto { IdToken = "verified-token" });

        var result = Assert.IsType<ObjectResult>(action.Result);
        Assert.Equal(409, result.StatusCode);
        var body = Assert.IsType<ApiResponse<AuthResponseDto>>(result.Value);
        Assert.False(body.Success);
        Assert.Null(body.Data);
    }

    [Fact]
    public async Task GoogleLogin_RejectsExistingEmailWithoutExplicitLinking()
    {
        await using var db = CreateDatabase();
        db.Users.Add(new User { Email = "user@example.com", FullName = "Password User", PasswordHash = "hash" });
        await db.SaveChangesAsync();

        var service = new AuthService(db, new FakeJwtTokenService(), new FakeGoogleValidator(
            new GoogleIdentity("google-subject-1", "user@example.com", "Google User", null, true)));

        var exception = await Assert.ThrowsAsync<GoogleAuthException>(() =>
            service.GoogleLoginAsync(new GoogleAuthRequestDto { IdToken = "verified-token" }));

        Assert.Equal(409, exception.StatusCode);
        Assert.Equal(1, await db.Users.CountAsync());
        Assert.Null((await db.Users.SingleAsync()).GoogleId);
    }

    [Fact]
    public async Task GoogleLogin_CreatesUserFromVerifiedIdentity()
    {
        await using var db = CreateDatabase();
        var service = new AuthService(db, new FakeJwtTokenService(), new FakeGoogleValidator(
            new GoogleIdentity("google-subject-2", "New.User@example.com", "New User", "https://example.com/avatar.png", true)));

        var result = await service.GoogleLoginAsync(new GoogleAuthRequestDto { IdToken = "verified-token" });

        Assert.True(result.Success);
        var user = await db.Users.SingleAsync();
        Assert.Equal("new.user@example.com", user.Email);
        Assert.Equal("google-subject-2", user.GoogleId);
        Assert.Equal("New User", user.FullName);
        Assert.Null(user.PasswordHash);
    }

    [Fact]
    public async Task GoogleLogin_ReusesExistingGoogleSubject()
    {
        await using var db = CreateDatabase();
        var existingUser = new User
        {
            Email = "existing@example.com",
            FullName = "Existing User",
            GoogleId = "google-subject-existing",
            IsEmailVerified = true
        };
        db.Users.Add(existingUser);
        await db.SaveChangesAsync();

        var service = new AuthService(db, new FakeJwtTokenService(), new FakeGoogleValidator(
            new GoogleIdentity("google-subject-existing", "existing@example.com", "Existing User", null, true)));
        var result = await service.GoogleLoginAsync(new GoogleAuthRequestDto { IdToken = "verified-token" });

        Assert.True(result.Success);
        Assert.Equal(existingUser.Id, result.Data!.User.Id);
        Assert.Equal(1, await db.Users.CountAsync());
    }

    [Fact]
    public async Task GoogleLogin_RejectsUnverifiedEmail()
    {
        await using var db = CreateDatabase();
        var service = new AuthService(db, new FakeJwtTokenService(), new FakeGoogleValidator(
            new GoogleIdentity("google-subject-3", "unverified@example.com", "Unverified", null, false)));

        var exception = await Assert.ThrowsAsync<GoogleAuthException>(() =>
            service.GoogleLoginAsync(new GoogleAuthRequestDto { IdToken = "verified-token" }));

        Assert.Equal(401, exception.StatusCode);
        Assert.Empty(await db.Users.ToListAsync());
    }

    private static ApplicationDbContext CreateDatabase()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private sealed class FakeGoogleValidator(GoogleIdentity identity) : IGoogleIdTokenValidator
    {
        public Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken cancellationToken = default) => Task.FromResult(identity);
    }

    private sealed class FakeJwtTokenService : IJwtTokenService
    {
        public string GenerateToken(User user) => "test-smartmeal-jwt";
    }

    private sealed class ThrowingAuthService(GoogleAuthException exception) : IAuthService
    {
        public Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto dto) => throw new NotImplementedException();
        public Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto dto) => throw new NotImplementedException();
        public Task<ApiResponse<AuthResponseDto>> GoogleLoginAsync(GoogleAuthRequestDto dto) => throw exception;
        public Task<ApiResponse<UserDto>> GetCurrentUserAsync(Guid userId) => throw new NotImplementedException();
        public Task<ApiResponse<UserDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto dto) => throw new NotImplementedException();
    }
}
