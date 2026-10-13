using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using SmartMeal.Application.Common.Models;

namespace SmartMeal.API.Infrastructure;

/// <summary>Chuyển lỗi ModelState (binding/validation) thành envelope 400 thống nhất, thông điệp tiếng Việt.</summary>
public static partial class ModelStateErrorResponse
{
    public static IActionResult Create(ActionContext context)
    {
        var errors = new List<string>();
        foreach (var (key, entry) in context.ModelState)
        {
            if (entry.Errors.Count == 0)
            {
                continue;
            }

            foreach (var error in entry.Errors)
            {
                errors.Add(Format(key, error));
            }
        }

        var distinct = errors.Distinct().ToList();
        var message = distinct.Count == 1 ? distinct[0] : "Dữ liệu không hợp lệ.";
        return new BadRequestObjectResult(ApiResponse<object>.Fail(message, distinct));
    }

    private static string Format(string key, ModelError error)
    {
        var field = key.StartsWith("$.", StringComparison.Ordinal) ? key[2..] : key;
        var text = error.ErrorMessage;

        // Lỗi đọc JSON (sai cú pháp, sai kiểu, sai định dạng ngày...) — không lộ chi tiết nội bộ của bộ phân tích.
        if (error.Exception is not null || string.IsNullOrWhiteSpace(text) || LooksLikeParserMessage(text))
        {
            return string.IsNullOrEmpty(field) || field == "$"
                ? "Nội dung gửi lên không phải JSON hợp lệ."
                : $"Giá trị của '{field}' không hợp lệ.";
        }

        if (text.StartsWith("A non-empty request body is required", StringComparison.Ordinal))
        {
            return "Nội dung yêu cầu không được để trống.";
        }

        var required = RequiredPattern().Match(text);
        if (required.Success)
        {
            return $"Trường '{required.Groups[1].Value}' là bắt buộc.";
        }

        return text;
    }

    private static bool LooksLikeParserMessage(string text) =>
        text.Contains("LineNumber", StringComparison.Ordinal) ||
        text.Contains("BytePositionInLine", StringComparison.Ordinal) ||
        text.StartsWith("The JSON value", StringComparison.Ordinal) ||
        text.StartsWith("Error converting", StringComparison.Ordinal) ||
        text.StartsWith("Failed to read", StringComparison.Ordinal);

    [GeneratedRegex(@"^The (\w+) field is required\.$")]
    private static partial Regex RequiredPattern();
}
