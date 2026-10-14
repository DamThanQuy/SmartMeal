using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartMeal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class OtpFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Bảng này chưa từng được dùng. Xóa mọi dòng cũ (có thể chứa mã OTP dạng thuần) rồi thay cột OtpCode
            // bằng CodeHash (băm) + Purpose — KHÔNG đổi tên cột vì sẽ giữ lại mã thuần ở cột mới.
            migrationBuilder.Sql("DELETE FROM \"OtpVerifications\";");

            migrationBuilder.DropColumn(
                name: "OtpCode",
                table: "OtpVerifications");

            migrationBuilder.AddColumn<string>(
                name: "Purpose",
                table: "OtpVerifications",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Attempts",
                table: "OtpVerifications",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "CodeHash",
                table: "OtpVerifications",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "OtpVerifications",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_OtpVerifications_Email_Purpose_CreatedAt",
                table: "OtpVerifications",
                columns: new[] { "Email", "Purpose", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_OtpVerifications_Email_Purpose_CreatedAt",
                table: "OtpVerifications");

            migrationBuilder.DropColumn(
                name: "Attempts",
                table: "OtpVerifications");

            migrationBuilder.DropColumn(
                name: "CodeHash",
                table: "OtpVerifications");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "OtpVerifications");

            migrationBuilder.DropColumn(
                name: "Purpose",
                table: "OtpVerifications");

            migrationBuilder.AddColumn<string>(
                name: "OtpCode",
                table: "OtpVerifications",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
