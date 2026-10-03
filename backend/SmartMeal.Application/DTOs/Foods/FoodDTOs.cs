using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Application.DTOs.Foods;

public class FoodServingDto
{
    public Guid Id { get; set; }

    /// <summary>Nhãn khẩu phần, vd. "1 tô".</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Khối lượng của khẩu phần (gam).</summary>
    public double Grams { get; set; }
}

public class FoodItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string Category { get; set; } = "General";
    public string DefaultUnit { get; set; } = "g";
    public decimal EstimatedPriceVnd { get; set; }

    public double CaloriesPer100g { get; set; }
    public double CarbsPer100g { get; set; }
    public double FatPer100g { get; set; }
    public double ProteinPer100g { get; set; }
    public double FiberPer100g { get; set; }
    public double SugarPer100g { get; set; }
    public double SodiumMgPer100g { get; set; }

    /// <summary>Chất gây dị ứng chính (giữ để tương thích). Dùng <see cref="AllergyIds"/> để lọc đầy đủ.</summary>
    public int? AllergyId { get; set; }
    public string? AllergyName { get; set; }

    /// <summary>Id (/meta/allergies) của mọi chất gây dị ứng trong thực phẩm này (BR-101/102).</summary>
    public List<int> AllergyIds { get; set; } = new();

    /// <summary>Số liệu đã được kiểm chứng. false với món do người dùng nhập và món mẫu chưa rà soát (BR-120/121).</summary>
    public bool IsVerified { get; set; }

    /// <summary>Do người dùng tự nhập (chỉ chủ sở hữu thấy).</summary>
    public bool IsUserCreated { get; set; }

    /// <summary>Nằm trong danh sách yêu thích của người dùng đang đăng nhập (false nếu chưa đăng nhập).</summary>
    public bool IsFavorite { get; set; }

    public string? Barcode { get; set; }

    public List<FoodServingDto> Servings { get; set; } = new();
    public Guid? DefaultServingId { get; set; }
}

/// <summary>Điều kiện tìm thực phẩm.</summary>
public class FoodQuery
{
    public string? Search { get; set; }
    public string? Category { get; set; }

    /// <summary>all (mặc định: thực phẩm chung + của tôi) | mine (tôi tự nhập) | recent (đã ghi nhật ký gần đây) | favorite (yêu thích).</summary>
    public string? Scope { get; set; }

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class CreateFoodServingDto
{
    [Required(ErrorMessage = "Nhãn khẩu phần không được để trống.")]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "Nhãn khẩu phần phải từ 1 đến 50 ký tự.")]
    public string Label { get; set; } = string.Empty;

    [Range(0.1, 5000, ErrorMessage = "Khối lượng khẩu phần phải từ 0,1 đến 5000 g.")]
    public double Grams { get; set; }

    /// <summary>Khẩu phần mặc định. Không đánh dấu thì lấy khẩu phần đầu tiên.</summary>
    public bool IsDefault { get; set; }
}

/// <summary>
/// Người dùng tự nhập một món khi không tìm thấy. Mọi số liệu do người dùng cung cấp, hệ thống không tự suy ra hay bịa
/// (BR-120/121); món được gắn nhãn "do người dùng nhập" và chỉ chủ sở hữu thấy.
/// </summary>
public class CreateFoodRequestDto
{
    [Required(ErrorMessage = "Tên món không được để trống.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Tên món phải từ 1 đến 100 ký tự.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Mô tả tối đa 500 ký tự.")]
    public string? Description { get; set; }

    [StringLength(500, ErrorMessage = "Đường dẫn ảnh tối đa 500 ký tự.")]
    public string? ImageUrl { get; set; }

    [StringLength(50, ErrorMessage = "Nhóm tối đa 50 ký tự.")]
    public string? Category { get; set; }

    [RegularExpression(@"^\d{8,14}$", ErrorMessage = "Mã vạch phải gồm 8 đến 14 chữ số.")]
    public string? Barcode { get; set; }

    [Range(0, 900, ErrorMessage = "Năng lượng trên 100 g phải từ 0 đến 900 kcal.")]
    public double CaloriesPer100g { get; set; }

    [Range(0, 100, ErrorMessage = "Tinh bột trên 100 g phải từ 0 đến 100 g.")]
    public double CarbsPer100g { get; set; }

    [Range(0, 100, ErrorMessage = "Chất béo trên 100 g phải từ 0 đến 100 g.")]
    public double FatPer100g { get; set; }

    [Range(0, 100, ErrorMessage = "Chất đạm trên 100 g phải từ 0 đến 100 g.")]
    public double ProteinPer100g { get; set; }

    [Range(0, 100, ErrorMessage = "Chất xơ trên 100 g phải từ 0 đến 100 g.")]
    public double FiberPer100g { get; set; }

    [Range(0, 100, ErrorMessage = "Đường trên 100 g phải từ 0 đến 100 g.")]
    public double SugarPer100g { get; set; }

    [Range(0, 40000, ErrorMessage = "Natri trên 100 g phải từ 0 đến 40000 mg.")]
    public double SodiumMgPer100g { get; set; }

    [MaxLength(20, ErrorMessage = "Tối đa 20 chất gây dị ứng.")]
    public List<int>? AllergyIds { get; set; }

    [MaxLength(10, ErrorMessage = "Tối đa 10 khẩu phần.")]
    public List<CreateFoodServingDto>? Servings { get; set; }
}

public class FoodFavoriteDto
{
    public bool IsFavorite { get; set; }
}
