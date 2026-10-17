namespace SmartMeal.Application.Common;

/// <summary>Deep link của app mobile (scheme "smartmealmobile" trong frontend/SmartMealMobile/app.json).</summary>
public static class AppDeepLink
{
    public const string Scheme = "smartmealmobile";

    /// <summary>Đích quay về sau khi thanh toán (PayOS, app ngân hàng): app không điều hướng, màn chờ tự hỏi trạng thái.</summary>
    public const string PaymentResult = Scheme + "://payment-result";

    /// <summary>
    /// Chỉ nhận deep link của chính app — không phải trang web bất kỳ (tránh bị lợi dụng chuyển hướng). Expo Go dùng
    /// <c>exp://</c>/<c>exps://</c> nên chỉ nhận khi <paramref name="allowExpoGo"/> (môi trường Development).
    /// </summary>
    public static bool IsAllowed(string? url, bool allowExpoGo)
    {
        if (string.IsNullOrWhiteSpace(url) || !Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri))
        {
            return false;
        }

        return string.Equals(uri.Scheme, Scheme, StringComparison.OrdinalIgnoreCase)
            || (allowExpoGo && uri.Scheme.ToLowerInvariant() is "exp" or "exps");
    }
}
