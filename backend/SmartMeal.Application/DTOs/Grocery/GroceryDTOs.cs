using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Application.DTOs.Grocery;

public class GrocerySummaryDto
{
    public int TotalItems { get; set; }
    public int CheckedItems { get; set; }
    public decimal TotalEstimatedCostVnd { get; set; }
    public List<GroceryCategoryDto> Categories { get; set; } = new();
}

public class GroceryCategoryDto
{
    public string CategoryName { get; set; } = string.Empty;
    public List<GroceryItemDto> Items { get; set; } = new();
}

public class GroceryItemDto
{
    public Guid Id { get; set; }
    public string IngredientName { get; set; } = string.Empty;
    public double Amount { get; set; }
    public string Unit { get; set; } = "g";
    public string Category { get; set; } = "Rau củ";
    public decimal EstimatedPriceVnd { get; set; }
    public bool IsChecked { get; set; }

    /// <summary>Công thức đầu tiên cần nguyên liệu này (null với món tự thêm).</summary>
    public string? RecipeTitle { get; set; }

    /// <summary>Số bữa trong thực đơn được gộp vào dòng này ("Gộp từ N món"); 0 với món tự thêm.</summary>
    public int MergedFromRecipeCount { get; set; }
}

public class GenerateGroceryRequestDto
{
    [Required(ErrorMessage = "Vui lòng chọn ngày bắt đầu.")]
    public DateOnly StartDate { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn ngày kết thúc.")]
    public DateOnly EndDate { get; set; }

    /// <summary>
    /// true (mặc định) = thay danh sách đã tạo từ thực đơn trước đó bằng danh sách mới; các món người dùng tự thêm được giữ.
    /// false = giữ mọi dòng hiện có và cộng dồn vào dòng chưa mua cùng tên/đơn vị (chuyển phần còn lại sang tuần mới) —
    /// chỉ nên dùng khi tạo cho một khoảng ngày khác, vì tạo lại cùng khoảng sẽ cộng đôi.
    /// </summary>
    public bool ClearExisting { get; set; } = true;
}

public class AddCustomGroceryItemDto
{
    [Required(ErrorMessage = "Tên nguyên liệu không được để trống.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Tên nguyên liệu phải từ 1 đến 100 ký tự.")]
    public string IngredientName { get; set; } = string.Empty;

    [Range(0.01, 100000, ErrorMessage = "Số lượng phải lớn hơn 0.")]
    public double Amount { get; set; } = 1.0;

    [StringLength(20, ErrorMessage = "Đơn vị tối đa 20 ký tự.")]
    public string Unit { get; set; } = "phần";

    [StringLength(50, ErrorMessage = "Nhóm tối đa 50 ký tự.")]
    public string? Category { get; set; }

    [Range(0, 100000000, ErrorMessage = "Giá ước tính không hợp lệ.")]
    public decimal? EstimatedPriceVnd { get; set; }
}

public class ToggleGroceryItemRequestDto
{
    public bool IsChecked { get; set; }
}

public class CheckAllGroceryItemsRequestDto
{
    /// <summary>true = đánh dấu đã mua tất cả, false = bỏ đánh dấu tất cả. Bỏ trống = true.</summary>
    public bool IsChecked { get; set; } = true;
}
