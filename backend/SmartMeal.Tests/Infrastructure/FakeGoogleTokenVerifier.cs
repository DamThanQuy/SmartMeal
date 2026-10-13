using System.Collections.Concurrent;
using SmartMeal.Application.Services;

namespace SmartMeal.Tests.Infrastructure;

/// <summary>Thay bộ xác minh Google thật trong test: token nào được đăng ký thì trả danh tính tương ứng, còn lại coi là không hợp lệ.</summary>
public sealed class FakeGoogleTokenVerifier : IGoogleTokenVerifier
{
    private readonly ConcurrentDictionary<string, GoogleIdentity> _tokens = new();

    public bool IsConfigured { get; set; } = true;

    public void Add(string idToken, GoogleIdentity identity) => _tokens[idToken] = identity;

    public Task<GoogleIdentity?> VerifyAsync(string idToken, CancellationToken cancellationToken = default) =>
        Task.FromResult(_tokens.TryGetValue(idToken, out var identity) ? identity : null);
}
