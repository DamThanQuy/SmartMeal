using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartMeal.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class IngredientAllergens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MealTypes",
                table: "Recipes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "IngredientAllergies",
                columns: table => new
                {
                    IngredientId = table.Column<Guid>(type: "uuid", nullable: false),
                    AllergyId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IngredientAllergies", x => new { x.IngredientId, x.AllergyId });
                    table.ForeignKey(
                        name: "FK_IngredientAllergies_Allergies_AllergyId",
                        column: x => x.AllergyId,
                        principalTable: "Allergies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IngredientAllergies_Ingredients_IngredientId",
                        column: x => x.IngredientId,
                        principalTable: "Ingredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IngredientAllergies_AllergyId",
                table: "IngredientAllergies",
                column: "AllergyId");

            // Dữ liệu cũ: mỗi nguyên liệu chỉ có 1 chất gây dị ứng ở cột Ingredients.AllergyId → chép sang bảng N-N
            // để lọc dị ứng không bị mất khi nguyên liệu có thêm chất thứ hai.
            migrationBuilder.Sql("""
                INSERT INTO "IngredientAllergies" ("IngredientId", "AllergyId")
                SELECT "Id", "AllergyId" FROM "Ingredients" WHERE "AllergyId" IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IngredientAllergies");

            migrationBuilder.DropColumn(
                name: "MealTypes",
                table: "Recipes");
        }
    }
}
