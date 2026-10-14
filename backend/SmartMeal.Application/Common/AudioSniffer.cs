namespace SmartMeal.Application.Common;

/// <summary>
/// Nhận diện file ghi âm bằng chữ ký đầu file — không tin tên file hay Content-Type do client gửi — và trả MIME gửi cho AI.
/// Hỗ trợ: WAV, AAC (ADTS), MP3, OGG, FLAC, WebM và MP4/M4A (AAC trong container MP4 — mặc định của expo-av).
/// </summary>
public static class AudioSniffer
{
    public static string? DetectMimeType(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length >= 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes.Slice(8, 4).SequenceEqual("WAVE"u8))
        {
            return "audio/wav";
        }

        if (bytes.Length >= 4 && bytes[..4].SequenceEqual("OggS"u8))
        {
            return "audio/ogg";
        }

        if (bytes.Length >= 4 && bytes[..4].SequenceEqual("fLaC"u8))
        {
            return "audio/flac";
        }

        if (bytes.Length >= 4 && bytes[0] == 0x1A && bytes[1] == 0x45 && bytes[2] == 0xDF && bytes[3] == 0xA3)
        {
            return "audio/webm";
        }

        if (bytes.Length >= 12 && bytes.Slice(4, 4).SequenceEqual("ftyp"u8))
        {
            return "audio/mp4";
        }

        if (bytes.Length >= 3 && bytes[..3].SequenceEqual("ID3"u8))
        {
            return "audio/mp3";
        }

        // Khung ADTS của AAC: 12 bit đồng bộ 0xFFF, 2 bit layer luôn bằng 0.
        if (bytes.Length >= 2 && bytes[0] == 0xFF && (bytes[1] & 0xF6) == 0xF0)
        {
            return "audio/aac";
        }

        // Khung MPEG audio (MP3 không có thẻ ID3): 11 bit đồng bộ.
        if (bytes.Length >= 2 && bytes[0] == 0xFF && (bytes[1] & 0xE0) == 0xE0)
        {
            return "audio/mp3";
        }

        return null;
    }
}
