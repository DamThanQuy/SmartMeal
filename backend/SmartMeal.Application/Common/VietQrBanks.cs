namespace SmartMeal.Application.Common;

/// <summary>
/// Danh mục ngân hàng VietQR/NAPAS (mã, BIN, tên ngắn — theo https://api.vietqr.io/v2/banks). Dùng để đổi mã ngân hàng cấu
/// hình cho SePay (vd. <c>MBBank</c>, <c>VCB</c>, <c>970422</c>) sang mã VietQR viết thường (<c>mb</c>) mà link mở app ngân
/// hàng <c>dl.vietqr.io/pay</c> yêu cầu để điền sẵn số tài khoản/số tiền/nội dung.
/// </summary>
public static class VietQrBanks
{
    public sealed record Bank(string Code, string Bin, string ShortName);

    public static readonly IReadOnlyList<Bank> All = new Bank[]
    {
        new("ABB", "970425", "ABBANK"),
        new("ACB", "970416", "ACB"),
        new("VBA", "970405", "Agribank"),
        new("BAB", "970409", "BacABank"),
        new("BVB", "970438", "BaoVietBank"),
        new("BIDC", "555666", "BIDC"),
        new("BIDV", "970418", "BIDV"),
        new("BNP HCM", "963666", "BNP HCM"),
        new("BNP HN", "963668", "BNP HN"),
        new("BOCHK", "963688", "BOCHK"),
        new("BSP", "970465", "BSP"),
        new("CAKE", "546034", "CAKE"),
        new("CBB", "970444", "CBBank"),
        new("CIMB", "422589", "CIMB"),
        new("CITIBANK", "533948", "Citibank"),
        new("COOPBANK", "970446", "COOPBANK"),
        new("CUBHCM", "168999", "CUBHCM"),
        new("DBS", "796500", "DBSBank"),
        new("ESUN", "963686", "ESUN"),
        new("EIB", "970431", "Eximbank"),
        new("GPB", "970408", "GPBank"),
        new("HDB", "970437", "HDBank"),
        new("HLBVN", "970442", "HongLeong"),
        new("HSBC", "458761", "HSBC"),
        new("IBK - HCM", "970456", "IBKHCM"),
        new("IBK - HN", "970455", "IBKHN"),
        new("ICBC", "963669", "ICBC"),
        new("IVB", "970434", "IndovinaBank"),
        new("KBank", "668888", "KBank"),
        new("KEBHANAHCM", "970466", "KEBHanaHCM"),
        new("KEBHANAHN", "970467", "KEBHANAHN"),
        new("KLB", "970452", "KienLongBank"),
        new("KBHCM", "970463", "KookminHCM"),
        new("KBHN", "970462", "KookminHN"),
        new("LPB", "970449", "LPBank"),
        new("MAFC", "977777", "MAFC"),
        new("MB", "970422", "MBBank"),
        new("MBV", "970414", "MBV"),
        new("momo", "971025", "MoMo"),
        new("MSB", "970426", "MSB"),
        new("MVAS", "971032", "MVAS"),
        new("NAB", "970428", "NamABank"),
        new("NCB", "970419", "NCB"),
        new("NHB HN", "801011", "Nonghyup"),
        new("OCB", "970448", "OCB"),
        new("PGB", "970430", "PGBank"),
        new("PBVN", "970439", "PublicBank"),
        new("PVCB", "970412", "PVcomBank"),
        new("PVDB", "971133", "PVcomBank Pay"),
        new("STB", "970403", "Sacombank"),
        new("SGICB", "970400", "SaigonBank"),
        new("SCB", "970429", "SCB"),
        new("SEAB", "970440", "SeABank"),
        new("SHB", "970443", "SHB"),
        new("SHBVN", "970424", "ShinhanBank"),
        new("SCVN", "970410", "StandardChartered"),
        new("TCB", "970407", "Techcombank"),
        new("TIMO", "963388", "Timo"),
        new("TNEX", "963326", "TNEX"),
        new("TPB", "970423", "TPBank"),
        new("Ubank", "546035", "Ubank"),
        new("UOB", "970458", "UnitedOverseas"),
        new("VBSP", "999888", "VBSP"),
        new("VIB", "970441", "VIB"),
        new("VAB", "970427", "VietABank"),
        new("VIETBANK", "970433", "VietBank"),
        new("VCCB", "970454", "VietCapitalBank"),
        new("VCB", "970436", "Vietcombank"),
        new("ICB", "970415", "VietinBank"),
        new("VTLMONEY", "971005", "ViettelMoney"),
        new("Vikki", "970406", "Vikki"),
        new("VNPTMONEY", "971011", "VNPTMoney"),
        new("VPB", "970432", "VPBank"),
        new("VRB", "970421", "VRB"),
        new("WVN", "970457", "Woori"),
        new("ZALOPAY", "971101", "ZaloPay"),
    };

    /// <summary>Mã VietQR viết thường của ngân hàng (khớp mã, BIN hoặc tên ngắn, không phân biệt hoa thường); null nếu không biết.</summary>
    public static string? FindCode(string? bankCode)
    {
        var key = bankCode?.Trim();
        if (string.IsNullOrEmpty(key))
        {
            return null;
        }

        var bank = All.FirstOrDefault(b =>
            string.Equals(b.Code, key, StringComparison.OrdinalIgnoreCase)
            || string.Equals(b.ShortName, key, StringComparison.OrdinalIgnoreCase)
            || b.Bin == key);
        return bank?.Code.ToLowerInvariant();
    }
}
