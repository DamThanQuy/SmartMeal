using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace SmartMeal.Application.Common.Validation;

/// <summary>
/// Ngày không được ở tương lai quá <c>toleranceDays</c> ngày so với hôm nay theo UTC (mặc định 1 ngày,
/// để chấp nhận người dùng ở múi giờ đi trước UTC). <c>null</c> hợp lệ.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class DateNotAfterTodayAttribute : ValidationAttribute
{
    private readonly int _toleranceDays;

    public DateNotAfterTodayAttribute(int toleranceDays = 1)
    {
        _toleranceDays = toleranceDays;
        ErrorMessage = "{0} không được ở tương lai.";
    }

    public override string FormatErrorMessage(string name) =>
        string.Format(CultureInfo.InvariantCulture, ErrorMessage ?? string.Empty, name);

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        DateOnly? date = value switch
        {
            DateOnly d => d,
            DateTime dt => DateOnly.FromDateTime(dt),
            _ => null
        };

        if (date is null)
        {
            return ValidationResult.Success;
        }

        var limit = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(_toleranceDays);
        if (date.Value <= limit)
        {
            return ValidationResult.Success;
        }

        return new ValidationResult(
            FormatErrorMessage(validationContext.MemberName ?? validationContext.DisplayName),
            validationContext.MemberName is null ? null : new[] { validationContext.MemberName });
    }
}
