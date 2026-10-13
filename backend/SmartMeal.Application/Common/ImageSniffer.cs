namespace SmartMeal.Application.Common;

/// <summary>Nhận diện ảnh JPG/PNG/WebP bằng chữ ký đầu file — không tin tên file hay Content-Type do client gửi.</summary>
public static class ImageSniffer
{
    private static readonly byte[] PngSignature = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };

    /// <summary>Trả "jpg" | "png" | "webp" hoặc null nếu không phải ảnh được hỗ trợ.</summary>
    public static string? DetectExtension(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
        {
            return "jpg";
        }

        if (bytes.Length >= PngSignature.Length && bytes[..PngSignature.Length].SequenceEqual(PngSignature))
        {
            return "png";
        }

        if (bytes.Length >= 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes.Slice(8, 4).SequenceEqual("WEBP"u8))
        {
            return "webp";
        }

        return null;
    }

    public static string MimeType(string extension) => extension switch
    {
        "png" => "image/png",
        "webp" => "image/webp",
        _ => "image/jpeg"
    };
}
