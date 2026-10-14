using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace SmartMeal.Tests.Infrastructure;

/// <summary>
/// Làm cho cuộc đua ghi (hai request cùng thấy "chưa có" rồi cùng chèn) xảy ra một cách xác định thay vì trông chờ vào may rủi:
/// <paramref name="parties"/> câu lệnh đọc đầu tiên khớp <paramref name="match"/> sẽ phải chờ nhau — sau khi đã đọc xong kết quả —
/// rồi mới cùng đi tiếp. Các câu lệnh sau đó chạy bình thường.
/// </summary>
public sealed class RendezvousInterceptor : DbCommandInterceptor
{
    private readonly int _parties;
    private readonly Func<string, bool> _match;
    private readonly TaskCompletionSource _released = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private int _arrived;

    public RendezvousInterceptor(int parties, Func<string, bool> match)
    {
        _parties = parties;
        _match = match;
    }

    /// <summary>Số câu lệnh đã tới điểm hẹn (để test khẳng định cuộc đua thật sự xảy ra).</summary>
    public int Arrived => Volatile.Read(ref _arrived);

    public override async ValueTask<DbDataReader> ReaderExecutedAsync(
        DbCommand command, CommandExecutedEventData eventData, DbDataReader result, CancellationToken cancellationToken = default)
    {
        if (_match(command.CommandText) && Interlocked.Increment(ref _arrived) <= _parties)
        {
            if (_arrived == _parties)
            {
                _released.TrySetResult();
            }

            // Chờ tối đa 15 giây để một test cấu hình sai không treo cả bộ test.
            await Task.WhenAny(_released.Task, Task.Delay(TimeSpan.FromSeconds(15), cancellationToken));
        }

        return result;
    }
}
