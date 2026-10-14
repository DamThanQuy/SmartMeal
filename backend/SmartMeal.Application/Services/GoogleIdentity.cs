namespace SmartMeal.Application.Services;

public sealed record GoogleIdentity(string Subject, string Email, string FullName, string? AvatarUrl, bool EmailVerified);

public interface IGoogleIdTokenValidator
{
    Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken cancellationToken = default);
}

public sealed class GoogleAuthException : Exception
{
    public GoogleAuthException(int statusCode, string message, Exception? innerException = null)
        : base(message, innerException) => StatusCode = statusCode;

    public int StatusCode { get; }
}
