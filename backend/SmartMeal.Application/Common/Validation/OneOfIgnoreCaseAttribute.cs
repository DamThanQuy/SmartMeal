using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace SmartMeal.Application.Common.Validation;

/// <summary>
/// Chuỗi phải thuộc một tập giá trị cho phép (không phân biệt hoa/thường). <c>null</c> được coi là hợp lệ —
/// dùng thêm <see cref="RequiredAttribute"/> khi bắt buộc. Service chịu trách nhiệm chuẩn hóa về dạng chuẩn.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class OneOfIgnoreCaseAttribute : ValidationAttribute
{
    private readonly string[] _allowed;

    public OneOfIgnoreCaseAttribute(params string[] allowed)
    {
        _allowed = allowed;
        ErrorMessage = "{0} phải là một trong các giá trị: {1}.";
    }

    public override string FormatErrorMessage(string name) =>
        string.Format(CultureInfo.InvariantCulture, ErrorMessage ?? string.Empty, name, string.Join(", ", _allowed));

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is null)
        {
            return ValidationResult.Success;
        }

        if (value is string text && _allowed.Contains(text.Trim(), StringComparer.OrdinalIgnoreCase))
        {
            return ValidationResult.Success;
        }

        return new ValidationResult(
            FormatErrorMessage(validationContext.MemberName ?? validationContext.DisplayName),
            validationContext.MemberName is null ? null : new[] { validationContext.MemberName });
    }
}
