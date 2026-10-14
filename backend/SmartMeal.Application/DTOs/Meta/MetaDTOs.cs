namespace SmartMeal.Application.DTOs.Meta;

/// <summary>Một mục danh mục (dị ứng, bệnh lý, chế độ ăn). <see cref="Code"/> là mã ổn định để client ánh xạ.</summary>
public class MetaItemDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
