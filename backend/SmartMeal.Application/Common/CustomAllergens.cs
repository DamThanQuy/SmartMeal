using System.Text;
using System.Text.RegularExpressions;

namespace SmartMeal.Application.Common;

/// <summary>
/// "Dị ứng khác" người dùng tự gõ (vd. "dứa, kiwi") — những chất không có trong /meta/allergies. Mỗi mục là một từ khóa
/// khớp theo ranh giới từ với tên món/nguyên liệu/sản phẩm (BR-101/102). Từ khóa có dấu khớp đúng dấu ("dứa" không khớp
/// "dưa hấu"); gõ không dấu thì khớp mọi cách viết có dấu ("dua" khớp cả "dứa" lẫn "dưa") — thận trọng hơn là bỏ sót.
/// Đây là bộ lọc theo tên, không phải cam kết an toàn tuyệt đối (BR-112).
/// </summary>
public static class CustomAllergens
{
    public const int MaxLength = 200;
    private const int MinKeywordLength = 2;

    private static readonly char[] Separators = { ',', ';', '\n', '\r' };

    /// <summary>Chuẩn hóa để lưu: bỏ khoảng trắng thừa, bỏ mục trùng/quá ngắn, nối bằng ", ". Rỗng → null.</summary>
    public static string? Normalize(string? text)
    {
        var items = Split(text);
        return items.Count == 0 ? null : string.Join(", ", items);
    }

    /// <summary>Các từ khóa đã chuẩn hóa (chữ thường) từ chuỗi đã lưu.</summary>
    public static IReadOnlyList<string> Keywords(string? text) =>
        Split(text).Select(item => item.ToLowerInvariant()).ToList();

    /// <summary>Từ khóa đầu tiên xuất hiện trong một trong các văn bản, hoặc null.</summary>
    public static string? FindMatch(IReadOnlyList<string> keywords, IEnumerable<string?> texts)
    {
        if (keywords.Count == 0)
        {
            return null;
        }

        var candidates = texts.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t!.Normalize(NormalizationForm.FormC)).ToList();
        foreach (var keyword in keywords)
        {
            var folded = TextNormalizer.Fold(keyword);
            var hasDiacritics = !string.Equals(folded, keyword, StringComparison.Ordinal);
            foreach (var text in candidates)
            {
                if (hasDiacritics ? ContainsWord(text, keyword) : ContainsWord(TextNormalizer.Fold(text), folded))
                {
                    return keyword;
                }
            }
        }

        return null;
    }

    private static List<string> Split(string? text) =>
        (text ?? string.Empty)
            .Split(Separators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            // Bàn phím có thể gửi chữ có dấu dạng tổ hợp (NFD): đưa về dạng dựng sẵn để so khớp ổn định.
            .Select(item => Regex.Replace(item, @"\s+", " ").Normalize(NormalizationForm.FormC))
            .Where(item => item.Length >= MinKeywordLength)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

    // Cùng cách khớp với AllergenKeywords: ranh giới từ hiểu chữ có dấu ("cá" không khớp "các").
    private static bool ContainsWord(string text, string keyword) =>
        Regex.IsMatch(text, $@"(?<![\p{{L}}\p{{N}}]){Regex.Escape(keyword)}(?![\p{{L}}\p{{N}}])", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
}
