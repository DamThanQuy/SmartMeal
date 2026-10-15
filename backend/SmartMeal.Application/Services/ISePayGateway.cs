namespace SmartMeal.Application.Services;

/// <summary>Thông tin chuyển khoản hiển thị cho người dùng: ảnh VietQR và tài khoản nhận (đã liên kết SePay).</summary>
public sealed record SePayTransferInfo(string QrImageUrl, string BankCode, string AccountNumber, string? AccountName);

/// <summary>Một khoản tiền vào tài khoản do SePay ghi nhận. <c>Code</c> là mã thanh toán SePay tự nhận ra (có thể rỗng).</summary>
public sealed record SePayIncomingTransfer(string Id, decimal Amount, string Content, string? Code, string? ReferenceCode);

/// <summary>Kết quả đọc webhook SePay: sai khóa → <c>Authorized = false</c>; tiền ra hoặc body lạ → <c>Transfer = null</c>.</summary>
public sealed record SePayWebhookResult(bool Authorized, SePayIncomingTransfer? Transfer);

/// <summary>
/// Thanh toán chuyển khoản qua SePay (https://my.sepay.vn): VietQR tới tài khoản ngân hàng của chủ app, SePay báo tiền vào.
/// Cấu hình chỉ đặt qua biến môi trường — xem <c>SePay__*</c> trong backend/.env.example.
/// </summary>
public interface ISePayGateway
{
    /// <summary>false khi thiếu tài khoản nhận hoặc không có cách xác nhận nào: chọn SePay sẽ trả 503.</summary>
    bool IsConfigured { get; }

    /// <summary>Có API Token để tự hỏi giao dịch (dự phòng khi webhook không tới được máy chủ).</summary>
    bool CanQueryTransactions { get; }

    /// <summary>Tiền tố mã thanh toán (in hoa) — mã đầy đủ là tiền tố + 8 ký tự.</summary>
    string PaymentCodePrefix { get; }

    int ExpiryMinutes { get; }

    int StatusCheckIntervalSeconds { get; }

    SePayTransferInfo BuildTransferInfo(decimal amountVnd, string transferContent);

    /// <summary>Xác thực header <c>Authorization: Apikey ...</c> rồi đọc khoản tiền vào trong body webhook.</summary>
    SePayWebhookResult ReadWebhook(string? authorizationHeader, string rawBody);

    /// <summary>Các khoản tiền vào tài khoản nhận từ ngày (giờ Việt Nam) của <paramref name="sinceUtc"/> trở đi.</summary>
    Task<IReadOnlyList<SePayIncomingTransfer>> GetIncomingTransfersAsync(DateTime sinceUtc, CancellationToken cancellationToken = default);
}
