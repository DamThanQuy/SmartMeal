using SmartMeal.Application.DTOs.AI;

namespace SmartMeal.Application.Services;

public interface IAiQuotaService
{
    Task<AiQuotaDto> GetAsync(Guid userId);

    /// <summary>Ghi nhận một lượt dùng AI thành công (<paramref name="kind"/>: snap | voice | fridge).</summary>
    Task RecordUseAsync(Guid userId, string kind);
}
