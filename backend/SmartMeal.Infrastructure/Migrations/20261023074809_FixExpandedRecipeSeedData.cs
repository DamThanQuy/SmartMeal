using Microsoft.EntityFrameworkCore.Migrations;
using SmartMeal.Infrastructure.Data;

#nullable disable

namespace SmartMeal.Infrastructure.Migrations
{
    /// <summary>
    /// Chỉ sửa dữ liệu (không đổi schema): bù nguyên liệu gây dị ứng còn thiếu và gỡ nhãn "quick" sai cho các món mở rộng
    /// đã seed trên DB đang chạy — xem <see cref="ExpandedRecipeDataFix"/>. DB mới chưa có món nên không bị ảnh hưởng.
    /// </summary>
    public partial class FixExpandedRecipeSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(ExpandedRecipeDataFix.Sql);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Không hoàn tác: đưa lại dữ liệu sai (món có đậu phộng mà không báo dị ứng) là không an toàn.
        }
    }
}
