using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SmartMeal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class HealthProfileExtras : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "Tags",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "MedicalConditions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateOnly>(
                name: "DateOfBirth",
                table: "HealthProfiles",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WaterGoalMl",
                table: "HealthProfiles",
                type: "integer",
                nullable: false,
                defaultValue: 2000); // hồ sơ có sẵn dùng mục tiêu mặc định 2000 ml

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "Allergies",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "UserDietaryPreferences",
                columns: table => new
                {
                    HealthProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserDietaryPreferences", x => new { x.HealthProfileId, x.TagId });
                    table.ForeignKey(
                        name: "FK_UserDietaryPreferences_HealthProfiles_HealthProfileId",
                        column: x => x.HealthProfileId,
                        principalTable: "HealthProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserDietaryPreferences_Tags_TagId",
                        column: x => x.TagId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Allergies",
                keyColumn: "Id",
                keyValue: 1,
                column: "Code",
                value: "seafood");

            migrationBuilder.UpdateData(
                table: "Allergies",
                keyColumn: "Id",
                keyValue: 2,
                column: "Code",
                value: "peanut");

            migrationBuilder.UpdateData(
                table: "Allergies",
                keyColumn: "Id",
                keyValue: 3,
                column: "Code",
                value: "dairy");

            migrationBuilder.UpdateData(
                table: "Allergies",
                keyColumn: "Id",
                keyValue: 4,
                column: "Code",
                value: "egg");

            migrationBuilder.UpdateData(
                table: "Allergies",
                keyColumn: "Id",
                keyValue: 5,
                column: "Code",
                value: "gluten");

            migrationBuilder.UpdateData(
                table: "Allergies",
                keyColumn: "Id",
                keyValue: 6,
                column: "Code",
                value: "soy");

            migrationBuilder.InsertData(
                table: "Allergies",
                columns: new[] { "Id", "Code", "Description", "Name" },
                values: new object[,]
                {
                    { 7, "treeNut", "Hạnh nhân, óc chó, hạt điều, hạt dẻ", "Các loại hạt (Tree nuts)" },
                    { 8, "sesame", "Hạt mè, dầu mè, sốt mè", "Mè (Sesame)" }
                });

            migrationBuilder.UpdateData(
                table: "MedicalConditions",
                keyColumn: "Id",
                keyValue: 1,
                column: "Code",
                value: "diabetes");

            migrationBuilder.UpdateData(
                table: "MedicalConditions",
                keyColumn: "Id",
                keyValue: 2,
                column: "Code",
                value: "gout");

            migrationBuilder.UpdateData(
                table: "MedicalConditions",
                keyColumn: "Id",
                keyValue: 3,
                column: "Code",
                value: "hypertension");

            migrationBuilder.UpdateData(
                table: "MedicalConditions",
                keyColumn: "Id",
                keyValue: 4,
                column: "Code",
                value: "dyslipidemia");

            migrationBuilder.UpdateData(
                table: "Tags",
                keyColumn: "Id",
                keyValue: 1,
                column: "Code",
                value: "eatClean");

            migrationBuilder.UpdateData(
                table: "Tags",
                keyColumn: "Id",
                keyValue: 2,
                column: "Code",
                value: "keto");

            migrationBuilder.UpdateData(
                table: "Tags",
                keyColumn: "Id",
                keyValue: 3,
                column: "Code",
                value: "vegan");

            migrationBuilder.UpdateData(
                table: "Tags",
                keyColumn: "Id",
                keyValue: 4,
                column: "Code",
                value: "highProtein");

            migrationBuilder.UpdateData(
                table: "Tags",
                keyColumn: "Id",
                keyValue: 5,
                column: "Code",
                value: "quick");

            migrationBuilder.UpdateData(
                table: "Tags",
                keyColumn: "Id",
                keyValue: 6,
                column: "Code",
                value: "budget");

            migrationBuilder.InsertData(
                table: "Tags",
                columns: new[] { "Id", "Code", "Name" },
                values: new object[,]
                {
                    { 7, "lowCarb", "Low-Carb" },
                    { 8, "vegetarian", "Ăn Chay (Vegetarian)" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tags_Code",
                table: "Tags",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MedicalConditions_Code",
                table: "MedicalConditions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Allergies_Code",
                table: "Allergies",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserDietaryPreferences_TagId",
                table: "UserDietaryPreferences",
                column: "TagId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserDietaryPreferences");

            migrationBuilder.DropIndex(
                name: "IX_Tags_Code",
                table: "Tags");

            migrationBuilder.DropIndex(
                name: "IX_MedicalConditions_Code",
                table: "MedicalConditions");

            migrationBuilder.DropIndex(
                name: "IX_Allergies_Code",
                table: "Allergies");

            migrationBuilder.DeleteData(
                table: "Allergies",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Allergies",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Tags",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Tags",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DropColumn(
                name: "Code",
                table: "Tags");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "MedicalConditions");

            migrationBuilder.DropColumn(
                name: "DateOfBirth",
                table: "HealthProfiles");

            migrationBuilder.DropColumn(
                name: "WaterGoalMl",
                table: "HealthProfiles");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "Allergies");
        }
    }
}
