using System.Globalization;
using System.Text;

namespace SmartMeal.Application.Common;

public static class TextNormalizer
{
    /// <summary>
    /// Chữ thường, bỏ dấu tiếng Việt (đ → d) để tìm kiếm không phụ thuộc người dùng gõ có dấu hay không
    /// ("pho bo" khớp "Phở bò").
    /// </summary>
    public static string Fold(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        var lowered = text.Trim().ToLowerInvariant().Replace('đ', 'd');
        var decomposed = lowered.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(c);
            }
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }
}
