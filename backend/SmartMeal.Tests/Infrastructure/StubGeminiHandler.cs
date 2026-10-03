using System.Collections.Concurrent;
using System.Net;
using System.Text;
using System.Text.Json;

namespace SmartMeal.Tests.Infrastructure;

/// <summary>Thay Gemini thật: trả JSON mẫu (hoặc lỗi) và ghi lại các request để kiểm tra cách gọi.</summary>
public sealed class StubGeminiHandler : HttpMessageHandler
{
    public sealed record Call(Uri Url, string? ApiKeyHeader, string Body);

    private readonly ConcurrentQueue<Call> _calls = new();

    public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;

    /// <summary>Văn bản JSON mà "mô hình" trả về (nằm trong candidates[0].content.parts[0].text).</summary>
    public string ModelText { get; set; } = "{}";

    public IReadOnlyList<Call> Calls => _calls.ToArray();

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var body = request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken);
        request.Headers.TryGetValues("x-goog-api-key", out var keys);
        _calls.Enqueue(new Call(request.RequestUri!, keys?.FirstOrDefault(), body));

        var payload = JsonSerializer.Serialize(new
        {
            candidates = new[] { new { content = new { parts = new[] { new { text = ModelText } } } } }
        });

        return new HttpResponseMessage(Status)
        {
            Content = new StringContent(Status == HttpStatusCode.OK ? payload : "{\"error\":\"upstream\"}", Encoding.UTF8, "application/json")
        };
    }
}
