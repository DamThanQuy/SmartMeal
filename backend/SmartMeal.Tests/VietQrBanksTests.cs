using SmartMeal.Application.Common;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>Đổi mã ngân hàng cấu hình cho SePay sang mã VietQR viết thường mà link mở app ngân hàng (dl.vietqr.io) yêu cầu.</summary>
public class VietQrBanksTests
{
    [Theory]
    [InlineData("MBBank", "mb")]
    [InlineData("mbbank", "mb")]
    [InlineData("MB", "mb")]
    [InlineData("970422", "mb")]
    [InlineData("VCB", "vcb")]
    [InlineData("Vietcombank", "vcb")]
    [InlineData("VietinBank", "icb")]
    [InlineData(" TPBank ", "tpb")]
    public void Known_banks_map_to_their_lowercase_vietqr_code(string bankCode, string expected) =>
        Assert.Equal(expected, VietQrBanks.FindCode(bankCode));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("NotABank")]
    public void Unknown_banks_have_no_code(string? bankCode) =>
        Assert.Null(VietQrBanks.FindCode(bankCode));

    [Fact]
    public void App_deep_links_are_the_only_allowed_return_targets()
    {
        Assert.True(AppDeepLink.IsAllowed("smartmealmobile://payment-result", allowExpoGo: false));
        Assert.True(AppDeepLink.IsAllowed("exp://192.168.1.5:8081/--/payment-result", allowExpoGo: true));
        Assert.False(AppDeepLink.IsAllowed("exp://192.168.1.5:8081/--/payment-result", allowExpoGo: false));
        Assert.False(AppDeepLink.IsAllowed("https://evil.example", allowExpoGo: true));
        Assert.False(AppDeepLink.IsAllowed("not a url", allowExpoGo: true));
        Assert.False(AppDeepLink.IsAllowed(null, allowExpoGo: true));
    }
}
