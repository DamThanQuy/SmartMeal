using System.Collections.Concurrent;
using System.Net;
using System.Text;
using System.Text.Json;

namespace SmartMeal.Tests.Infrastructure;

/// <summary>Thay Gemini thật: trả JSON mẫu (hoặc lỗi) và ghi lại các request để kiểm tra cách gọi.</summary>
public sealed class StubGeminiHandler : HttpMessageHandler
{
    public sealed record Call(Uri Url, string? ApiKeyHeader, string Body)
    {
        /// <summary>Tên model trong URL (<c>…/models/{model}:generateContent</c>).</summary>
        public string Model => ModelOf(Url);
    }

    private readonly ConcurrentQueue<Call> _calls = new();

    public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;

    /// <summary>Trạng thái riêng cho từng model (theo tên trong URL); model không có ở đây trả <see cref="Status"/>.</summary>
    public Dictionary<string, HttpStatusCode> StatusByModel { get; } = new();

    /// <summary>Độ trễ trước khi model trả lời (mô phỏng model quá tải trả lời chậm).</summary>
    public Dictionary<string, TimeSpan> DelayByModel { get; } = new();

    /// <summary>Văn bản JSON mà "mô hình" trả về (nằm trong candidates[0].content.parts[0].text).</summary>
    public string ModelText { get; set; } = "{}";

    public IReadOnlyList<Call> Calls => _calls.ToArray();

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var body = request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken);
        request.Headers.TryGetValues("x-goog-api-key", out var keys);
        _calls.Enqueue(new Call(request.RequestUri!, keys?.FirstOrDefault(), body));

        if (DelayByModel.TryGetValue(ModelOf(request.RequestUri!), out var delay))
        {
            await Task.Delay(delay, cancellationToken);
        }

        var payload = JsonSerializer.Serialize(new
        {
            candidates = new[] { new { content = new { parts = new[] { new { text = ModelText } } } } }
        });

        var status = StatusByModel.TryGetValue(ModelOf(request.RequestUri!), out var byModel) ? byModel : Status;
        return new HttpResponseMessage(status)
        {
            Content = new StringContent(status == HttpStatusCode.OK ? payload : "{\"error\":\"upstream\"}", Encoding.UTF8, "application/json")
        };
    }

    private static string ModelOf(Uri url)
    {
        var path = url.AbsolutePath;
        var start = path.IndexOf("/models/", StringComparison.Ordinal) + "/models/".Length;
        var end = path.IndexOf(':', start);
        return end > start ? path[start..end] : path[start..];
    }
}
