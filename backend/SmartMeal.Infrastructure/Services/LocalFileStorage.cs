using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>Lưu file lên ổ đĩa cục bộ dưới <see cref="StorageOptions.Root"/>; chặn mọi đường dẫn thoát ra ngoài thư mục gốc.</summary>
public sealed class LocalFileStorage : IFileStorage
{
    private readonly string _root;

    /// <summary>
    /// Khởi tạo dịch vụ lưu trữ file cục bộ với cấu hình đường dẫn gốc thư mục uploads.
    /// </summary>
    /// <param name="options">Cấu hình lưu trữ tệp (StorageOptions.Root).</param>
    /// <param name="environment">Môi trường máy chủ (để lấy ContentRootPath làm fallback).</param>
    public LocalFileStorage(IOptions<StorageOptions> options, IHostEnvironment environment)
    {
        _root = ResolveRoot(options.Value, environment);
    }

    /// <summary>
    /// Xác định đường dẫn tuyệt đối của thư mục lưu trữ gốc từ cấu hình hoặc ContentRootPath.
    /// </summary>
    /// <param name="options">Cấu hình lưu trữ.</param>
    /// <param name="environment">Môi trường máy chủ ứng dụng.</param>
    /// <returns>Đường dẫn tuyệt đối đã chuẩn hóa của thư mục lưu trữ.</returns>
    public static string ResolveRoot(StorageOptions options, IHostEnvironment environment) =>
        Path.GetFullPath(string.IsNullOrWhiteSpace(options.Root) ? Path.Combine(environment.ContentRootPath, "uploads") : options.Root);

    /// <summary>
    /// Lưu luồng dữ liệu file (Stream) vào đường dẫn tương đối đã chỉ định, tự động tạo thư mục cha nếu chưa tồn tại.
    /// </summary>
    /// <param name="relativePath">Đường dẫn tương đối của file cần lưu.</param>
    /// <param name="content">Luồng dữ liệu file cần ghi.</param>
    /// <param name="cancellationToken">Token hủy thao tác bất đồng bộ.</param>
    public async Task SaveAsync(string relativePath, Stream content, CancellationToken cancellationToken = default)
    {
        var target = Resolve(relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);

        await using var file = new FileStream(target, FileMode.Create, FileAccess.Write, FileShare.None);
        await content.CopyToAsync(file, cancellationToken);
    }

    /// <summary>
    /// Xóa tệp tin tại đường dẫn tương đối chỉ định nếu tệp tồn tại trên đĩa.
    /// </summary>
    /// <param name="relativePath">Đường dẫn tương đối của tệp cần xóa.</param>
    /// <param name="cancellationToken">Token hủy thao tác bất đồng bộ.</param>
    public Task DeleteAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        var target = Resolve(relativePath);
        if (File.Exists(target))
        {
            File.Delete(target);
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// Xóa toàn bộ thư mục và các tệp con đệ quy tại đường dẫn tương đối chỉ định nếu thư mục tồn tại.
    /// </summary>
    /// <param name="relativePath">Đường dẫn tương đối của thư mục cần xóa.</param>
    /// <param name="cancellationToken">Token hủy thao tác bất đồng bộ.</param>
    public Task DeleteDirectoryAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        var target = Resolve(relativePath);
        if (Directory.Exists(target))
        {
            Directory.Delete(target, recursive: true);
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// Phân giải đường dẫn tương đối thành đường dẫn tuyệt đối an toàn, chặn mọi hành vi path traversal thoát ra ngoài thư mục gốc.
    /// </summary>
    /// <param name="relativePath">Đường dẫn tương đối của tệp.</param>
    /// <returns>Đường dẫn tuyệt đối an toàn trên hệ thống tệp tin.</returns>
    /// <exception cref="InvalidOperationException">Ném ra nếu đường dẫn cố tình thoát ra ngoài thư mục lưu trữ gốc.</exception>
    private string Resolve(string relativePath)
    {
        var full = Path.GetFullPath(Path.Combine(_root, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        var rootWithSeparator = _root.EndsWith(Path.DirectorySeparatorChar) ? _root : _root + Path.DirectorySeparatorChar;
        if (!full.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Đường dẫn file nằm ngoài thư mục lưu trữ.");
        }

        return full;
    }
}
