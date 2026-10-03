using Microsoft.AspNetCore.Diagnostics;

namespace SmartMeal.API.Infrastructure;

/// <summary>Bắt mọi exception chưa xử lý, ghi log kèm traceId và trả envelope lỗi (không lộ stack trace).</summary>
public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;
    private readonly IHostEnvironment _environment;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        // Client tự hủy kết nối: không có ai đọc phản hồi, không phải lỗi máy chủ.
        if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
        {
            return true;
        }

        var traceId = httpContext.TraceIdentifier;

        if (exception is BadHttpRequestException badRequest)
        {
            _logger.LogWarning(badRequest, "Bad HTTP request. TraceId={TraceId}", traceId);
            await ApiErrorWriter.WriteAsync(
                httpContext,
                badRequest.StatusCode,
                ApiErrorWriter.DefaultMessage(badRequest.StatusCode),
                new List<string> { $"traceId: {traceId}" });
            return true;
        }

        _logger.LogError(exception, "Unhandled exception. TraceId={TraceId}", traceId);

        var errors = new List<string> { $"traceId: {traceId}" };
        if (_environment.IsDevelopment())
        {
            errors.Add(exception.Message);
        }

        await ApiErrorWriter.WriteAsync(
            httpContext,
            StatusCodes.Status500InternalServerError,
            ApiErrorWriter.DefaultMessage(StatusCodes.Status500InternalServerError),
            errors);
        return true;
    }
}
