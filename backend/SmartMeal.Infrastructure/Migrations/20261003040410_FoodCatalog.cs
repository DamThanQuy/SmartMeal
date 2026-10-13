using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartMeal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FoodCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Barcode",
                table: "Ingredients",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsVerified",
                table: "Ingredients",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Các nguyên liệu có sẵn là danh mục chung của hệ thống (số liệu theo bảng dinh dưỡng chuẩn) nên coi là đã kiểm chứng;
            // món người dùng tự nhập và món mẫu thêm sau này gắn IsVerified = false khi tạo.
            migrationBuilder.Sql("UPDATE \"Ingredients\" SET \"IsVerified\" = true;");

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerUserId",
                table: "Ingredients",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SearchText",
                table: "Ingredients",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "FoodServings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IngredientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: false),
                    Grams = table.Column<double>(type: "double precision", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FoodServings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FoodServings_Ingredients_IngredientId",
                        column: x => x.IngredientId,
                        principalTable: "Ingredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserFavoriteFoods",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    IngredientId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserFavoriteFoods", x => new { x.UserId, x.IngredientId });
                    table.ForeignKey(
                        name: "FK_UserFavoriteFoods_Ingredients_IngredientId",
                        column: x => x.IngredientId,
                        principalTable: "Ingredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserFavoriteFoods_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Ingredients_Barcode",
                table: "Ingredients",
                column: "Barcode");

            migrationBuilder.CreateIndex(
                name: "IX_Ingredients_OwnerUserId",
                table: "Ingredients",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_FoodServings_IngredientId",
                table: "FoodServings",
                column: "IngredientId");

            migrationBuilder.CreateIndex(
                name: "IX_UserFavoriteFoods_IngredientId",
                table: "UserFavoriteFoods",
                column: "IngredientId");

            migrationBuilder.AddForeignKey(
                name: "FK_Ingredients_Users_OwnerUserId",
                table: "Ingredients",
                column: "OwnerUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Ingredients_Users_OwnerUserId",
                table: "Ingredients");

            migrationBuilder.DropTable(
                name: "FoodServings");

            migrationBuilder.DropTable(
                name: "UserFavoriteFoods");

            migrationBuilder.DropIndex(
                name: "IX_Ingredients_Barcode",
                table: "Ingredients");

            migrationBuilder.DropIndex(
                name: "IX_Ingredients_OwnerUserId",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "Barcode",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "IsVerified",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "OwnerUserId",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "SearchText",
                table: "Ingredients");
        }
    }
}
