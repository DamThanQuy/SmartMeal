using System.Globalization;
using System.Text;
using SmartMeal.Application.Common;

namespace SmartMeal.Infrastructure.Data;

/// <summary>
/// Sửa một lần dữ liệu món đã seed từ bản đầu của danh sách món mở rộng (commit dd46fbb) trên DB đang chạy. Seed chỉ nạp
/// món khi DB gần trống (<c>DbInitializer.Recipes.cs</c>) nên không tự sửa được món đã có; bản sửa ở
/// <c>recipes_seed.json</c> chỉ áp dụng cho DB mới. Chạy qua migration <c>FixExpandedRecipeSeedData</c>:
/// <list type="bullet">
/// <item>bổ sung nguyên liệu gây dị ứng có ngay trong tên món nhưng thiếu trong công thức (BR-102) — dị ứng của nguyên
/// liệu mới được <c>DbInitializer</c> gắn theo tên ở lần khởi động sau;</item>
/// <item>gỡ nhãn "quick" (≤ 15 phút) khỏi món thực tế nấu lâu hơn.</item>
/// </list>
/// Chỉ đụng đúng các món dưới đây, thiếu món nào thì bỏ qua, chạy lại không thêm gì. Đã phát hành thì không sửa SQL này
/// nữa — cần sửa thêm thì tạo migration mới.
/// </summary>
public static class ExpandedRecipeDataFix
{
    private sealed record MissingIngredient(
        string RecipeTitle, string Name, string Category, string Unit, double Amount,
        double CaloriesPer100g, double ProteinPer100g, double CarbsPer100g, double FatPer100g);

    // Giống phần đã thêm vào recipes_seed.json.
    private static readonly MissingIngredient[] MissingIngredients =
    [
        new("Bún riêu cua bắp bò đậu hũ Eat Clean", "Cua đồng", "Seafood", "g", 100, 87, 12.3, 2, 3.3),
        new("Bún bò xào Nam Bộ rau sống đậu phộng", "Đậu phộng rang", "Grain", "g", 15, 585, 24, 21, 50),
        new("Salad cầu vồng bơ hạt dẻ sốt chanh leo", "Hạt dẻ cười", "Grain", "g", 15, 560, 20, 28, 45),
        new("Sữa chua Hy Lạp mix dâu tây granola hạt óc chó", "Hạt óc chó", "Grain", "g", 15, 654, 15, 14, 65),
        new("Pudding hạt chia sữa hạnh nhân xoài cát", "Nước hạnh nhân không đường", "Grain", "ml", 150, 15, 0.6, 0.3, 1.2),
        new("Thanh ngũ cốc Granola mật ong hạt điều", "Hạt điều", "Grain", "g", 40, 553, 18, 30, 44),
        new("Bánh mì nướng bơ tỏi kẹp phô mai ít béo", "Phô mai mozzarella ít béo", "Dairy", "g", 30, 254, 24, 3, 16)
    ];

    private static readonly string[] NotQuickTitles =
    [
        "Bò cuộn nấm kim châm nướng sốt tương",
        "Canh chua cá lóc rau muống bắp chuối",
        "Canh rong biển đậu hũ non thịt bằm",
        "Cháo yến mạch thịt bò bằm cà rốt",
        "Miến dong xào tôm nõn rau củ thập cẩm",
        "Mực nang hấp gừng sả chấm mắm ớt",
        "Salad tôm bơ trứng luộc sốt mè rang"
    ];

    private const int QuickTagMaxMinutes = 15;

    /// <summary>Câu lệnh PostgreSQL thực hiện bản sửa (migration và test dùng chung).</summary>
    public static string Sql { get; } = BuildSql();

    private static string BuildSql()
    {
        var sql = new StringBuilder();
        foreach (var fix in MissingIngredients)
        {
            var title = Text(fix.RecipeTitle);
            var name = Text(fix.Name);
            sql.AppendLine($"""
                INSERT INTO "Ingredients" ("Id", "Name", "Category", "DefaultUnit", "CaloriesPer100g", "ProteinPer100g", "CarbsPer100g", "FatPer100g", "FiberPer100g", "SugarPer100g", "SodiumMgPer100g", "EstimatedPriceVnd", "IsVerified", "SearchText")
                SELECT gen_random_uuid(), {name}, {Text(fix.Category)}, {Text(fix.Unit)}, {Number(fix.CaloriesPer100g)}, {Number(fix.ProteinPer100g)}, {Number(fix.CarbsPer100g)}, {Number(fix.FatPer100g)}, 0, 0, 0, 0, TRUE, {Text(TextNormalizer.Fold(fix.Name).Trim())}
                WHERE EXISTS (SELECT 1 FROM "Recipes" WHERE "Title" = {title})
                  AND NOT EXISTS (SELECT 1 FROM "Ingredients" WHERE "Name" = {name} AND "OwnerUserId" IS NULL);

                INSERT INTO "RecipeIngredients" ("RecipeId", "IngredientId", "Amount", "Unit")
                SELECT r."Id", i."Id", {Number(fix.Amount)}, {Text(fix.Unit)}
                FROM "Recipes" r
                CROSS JOIN LATERAL (SELECT "Id" FROM "Ingredients" WHERE "Name" = {name} AND "OwnerUserId" IS NULL ORDER BY "Id" LIMIT 1) i
                WHERE r."Title" = {title}
                ON CONFLICT DO NOTHING;
                """);
        }

        sql.AppendLine($"""
            DELETE FROM "RecipeTags" rt
            USING "Recipes" r, "Tags" t
            WHERE rt."RecipeId" = r."Id" AND rt."TagId" = t."Id" AND t."Code" = 'quick'
              AND r."PrepTimeMinutes" + r."CookTimeMinutes" > {QuickTagMaxMinutes}
              AND r."Title" IN ({string.Join(", ", NotQuickTitles.Select(Text))});
            """);
        return sql.ToString();
    }

    private static string Text(string value) => "'" + value.Replace("'", "''") + "'";

    private static string Number(double value) => value.ToString(CultureInfo.InvariantCulture);
}
