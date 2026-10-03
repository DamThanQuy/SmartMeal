using Npgsql;

namespace SmartMeal.Tests.Infrastructure;

/// <summary>Chạy SQL thô để dựng/kiểm tra dữ liệu ở các test migration.</summary>
public static class SqlHelper
{
    public static async Task ExecuteAsync(string connectionString, string sql)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync();
    }

    public static async Task<T> ScalarAsync<T>(string connectionString, string sql)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        return (T)(await command.ExecuteScalarAsync())!;
    }

    /// <summary>Chuỗi kết nối tới một database riêng (cùng server với <see cref="ApiFactory.ServerEnvVar"/>).</summary>
    public static (string Admin, string Database, string Connection) NewDatabase(string prefix)
    {
        var admin = Environment.GetEnvironmentVariable(ApiFactory.ServerEnvVar)!;
        var name = $"{prefix}_{Guid.NewGuid():N}";
        var connection = new NpgsqlConnectionStringBuilder(admin) { Database = name }.ConnectionString;
        return (admin, name, connection);
    }

    public static async Task DropDatabaseAsync(string admin, string name)
    {
        NpgsqlConnection.ClearAllPools();
        await ExecuteAsync(admin, $"DROP DATABASE IF EXISTS \"{name}\" WITH (FORCE)");
    }
}
