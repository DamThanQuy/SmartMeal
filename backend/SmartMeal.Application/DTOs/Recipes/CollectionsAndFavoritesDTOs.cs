using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Application.DTOs.Recipes;

public class CreateCollectionRequestDto
{
    [Required(ErrorMessage = "Tên bộ sưu tập không được để trống.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Tên bộ sưu tập phải từ 1 đến 100 ký tự.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Mô tả tối đa 500 ký tự.")]
    public string? Description { get; set; }

    [StringLength(500, ErrorMessage = "Đường dẫn ảnh bìa tối đa 500 ký tự.")]
    public string? CoverImageUrl { get; set; }

    public bool IsPublic { get; set; } = false;
}

/// <summary>Sửa bộ sưu tập (chỉ chủ sở hữu — BR-152). Trường không gửi giữ nguyên.</summary>
public class UpdateCollectionRequestDto
{
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Tên bộ sưu tập phải từ 1 đến 100 ký tự.")]
    public string? Name { get; set; }

    [StringLength(500, ErrorMessage = "Mô tả tối đa 500 ký tự.")]
    public string? Description { get; set; }

    [StringLength(500, ErrorMessage = "Đường dẫn ảnh bìa tối đa 500 ký tự.")]
    public string? CoverImageUrl { get; set; }

    public bool? IsPublic { get; set; }
}

public class RecipeCollectionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CoverImageUrl { get; set; }
    public int RecipeCount { get; set; }
    public bool IsPublic { get; set; }

    /// <summary>Chủ sở hữu bộ sưu tập (BR-152: chỉ chủ sở hữu được đổi tên/xóa/bỏ món).</summary>
    public Guid OwnerId { get; set; }

    /// <summary>Người dùng đang đăng nhập là chủ sở hữu.</summary>
    public bool IsOwner { get; set; }

    public List<RecipeDto> Recipes { get; set; } = new();
}

public class AddRecipeToCollectionDto
{
    public Guid RecipeId { get; set; }
}

public class FavoriteToggleResponseDto
{
    public bool IsFavorite { get; set; }
    public int TotalFavorites { get; set; }
}
