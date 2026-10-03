using System.Text.RegularExpressions;

namespace SmartMeal.Application.Common;

/// <summary>
/// Từ khóa nhận diện chất gây dị ứng trong văn bản (tên món, danh sách thành phần, nhãn sản phẩm). Dùng để kiểm tra
/// lại kết quả của AI một cách xác định, không phụ thuộc hoàn toàn vào việc mô hình có nhớ cảnh báo hay không
/// (BR-102/140). Khóa là <c>Allergy.Code</c>. Đây là bộ lọc bổ sung theo hướng thận trọng, không phải cam kết an toàn tuyệt đối.
/// </summary>
public static class AllergenKeywords
{
    private static readonly Dictionary<string, string[]> Map = new(StringComparer.OrdinalIgnoreCase)
    {
        ["seafood"] = new[] { "hải sản", "tôm", "cua", "ghẹ", "mực", "bạch tuộc", "ốc", "sò", "nghêu", "hàu", "cá", "shrimp", "prawn", "crab", "squid", "octopus", "fish", "salmon", "tuna", "seafood", "shellfish" },
        ["peanut"] = new[] { "đậu phộng", "lạc", "peanut" },
        ["dairy"] = new[] { "sữa", "phô mai", "pho mai", "kem tươi", "whey", "milk", "cheese", "butter", "cream", "yogurt" },
        ["egg"] = new[] { "trứng", "egg" },
        ["gluten"] = new[] { "lúa mì", "bột mì", "gluten", "bánh mì", "mì ý", "pasta", "wheat", "bread" },
        ["soy"] = new[] { "đậu nành", "đậu phụ", "đậu hũ", "nước tương", "tương đậu", "soy", "tofu" },
        ["treeNut"] = new[] { "hạnh nhân", "óc chó", "hạt điều", "hạt dẻ", "hạt phỉ", "almond", "walnut", "cashew", "hazelnut", "pistachio" },
        ["sesame"] = new[] { "mè", "vừng", "sesame" }
    };

    /// <summary>Các mã dị ứng trong <paramref name="allergyCodes"/> mà <paramref name="text"/> có nhắc tới.</summary>
    public static List<string> FindMatches(string? text, IEnumerable<string> allergyCodes)
    {
        var matches = new List<string>();
        if (string.IsNullOrWhiteSpace(text))
        {
            return matches;
        }

        foreach (var code in allergyCodes.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (Map.TryGetValue(code, out var keywords) && keywords.Any(k => ContainsWord(text, k)))
            {
                matches.Add(code);
            }
        }

        return matches;
    }

    // Khớp theo ranh giới từ (\b hiểu chữ có dấu) để "cá" không khớp trong "các loại".
    private static bool ContainsWord(string text, string keyword) =>
        Regex.IsMatch(text, $@"(?<![\p{{L}}\p{{N}}]){Regex.Escape(keyword)}(?![\p{{L}}\p{{N}}])", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
}
