using SmartMeal.Domain.Entities;

namespace SmartMeal.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(ApplicationDbContext db)
    {
        if (!db.Recipes.Any())
        {

        // 1. Ingredients
        var ingUcGa = new Ingredient { Name = "Ức gà phi lê", Category = "Meat", DefaultUnit = "g", CaloriesPer100g = 165, ProteinPer100g = 31, CarbsPer100g = 0, FatPer100g = 3.6, EstimatedPriceVnd = 18000 };
        var ingThitBo = new Ingredient { Name = "Thịt bò thăn", Category = "Meat", DefaultUnit = "g", CaloriesPer100g = 250, ProteinPer100g = 26, CarbsPer100g = 0, FatPer100g = 15, EstimatedPriceVnd = 35000 };
        var ingCaHoi = new Ingredient { Name = "Cá hồi phi lê", Category = "Seafood", DefaultUnit = "g", CaloriesPer100g = 208, ProteinPer100g = 20, CarbsPer100g = 0, FatPer100g = 13, AllergyId = 1, EstimatedPriceVnd = 65000 };
        var ingDauHu = new Ingredient { Name = "Đậu hũ non", Category = "Vegetable", DefaultUnit = "g", CaloriesPer100g = 76, ProteinPer100g = 8, CarbsPer100g = 1.9, FatPer100g = 4.8, AllergyId = 6, EstimatedPriceVnd = 5000 };
        var ingTrungGa = new Ingredient { Name = "Trứng gà", Category = "Dairy", DefaultUnit = "quả", CaloriesPer100g = 155, ProteinPer100g = 13, CarbsPer100g = 1.1, FatPer100g = 11, AllergyId = 4, EstimatedPriceVnd = 4000 };
        var ingGaoLut = new Ingredient { Name = "Gạo lứt đỏ", Category = "Grain", DefaultUnit = "g", CaloriesPer100g = 111, ProteinPer100g = 2.6, CarbsPer100g = 23, FatPer100g = 0.9, EstimatedPriceVnd = 8000 };
        var ingYenMach = new Ingredient { Name = "Yến mạch cán dẹt", Category = "Grain", DefaultUnit = "g", CaloriesPer100g = 389, ProteinPer100g = 16.9, CarbsPer100g = 66, FatPer100g = 6.9, AllergyId = 5, EstimatedPriceVnd = 12000 };
        var ingRauXaLach = new Ingredient { Name = "Xà lách Romaine", Category = "Vegetable", DefaultUnit = "g", CaloriesPer100g = 17, ProteinPer100g = 1.2, CarbsPer100g = 3.3, FatPer100g = 0.3, EstimatedPriceVnd = 6000 };
        var ingCaChua = new Ingredient { Name = "Cà chua bi", Category = "Vegetable", DefaultUnit = "g", CaloriesPer100g = 18, ProteinPer100g = 0.9, CarbsPer100g = 3.9, FatPer100g = 0.2, EstimatedPriceVnd = 7000 };
        var ingDuaLeo = new Ingredient { Name = "Dưa leo", Category = "Vegetable", DefaultUnit = "g", CaloriesPer100g = 15, ProteinPer100g = 0.7, CarbsPer100g = 3.6, FatPer100g = 0.1, EstimatedPriceVnd = 5000 };
        var ingOtChuong = new Ingredient { Name = "Ớt chuông đỏ", Category = "Vegetable", DefaultUnit = "g", CaloriesPer100g = 31, ProteinPer100g = 1, CarbsPer100g = 6, FatPer100g = 0.3, EstimatedPriceVnd = 9000 };
        var ingSotMeRang = new Ingredient { Name = "Sốt mè rang", Category = "Spice", DefaultUnit = "ml", CaloriesPer100g = 387, ProteinPer100g = 2.5, CarbsPer100g = 18, FatPer100g = 34, EstimatedPriceVnd = 15000 };

        var ingredients = new[] { ingUcGa, ingThitBo, ingCaHoi, ingDauHu, ingTrungGa, ingGaoLut, ingYenMach, ingRauXaLach, ingCaChua, ingDuaLeo, ingOtChuong, ingSotMeRang };
        await db.Ingredients.AddRangeAsync(ingredients);
        await db.SaveChangesAsync();

        // 2. Recipes
        var r1 = new Recipe
        {
            Title = "Salad ức gà sốt mè rang",
            Description = "Món salad tươi mát giàu đạm từ ức gà áp chảo và các loại rau giòn ngọt.",
            ImageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
            Instructions = "1. Áp chảo ức gà vàng 2 mặt rồi xé sợi.\n2. Rửa sạch xà lách, cà chua bi, dưa leo.\n3. Trộn đều rau với ức gà và rưới sốt mè rang.",
            PrepTimeMinutes = 10,
            CookTimeMinutes = 10,
            Servings = 1,
            Difficulty = "Easy",
            CaloriesPerServing = 380,
            ProteinPerServing = 38,
            CarbsPerServing = 15,
            FatPerServing = 12
        };

        var r2 = new Recipe
        {
            Title = "Cơm gạo lứt bò xào ớt chuông",
            Description = "Bữa trưa đầy đủ dinh dưỡng với thịt bò mềm ngọt và ớt chuông giòn ngọt giàu vitamin C.",
            ImageUrl = "https://images.unsplash.com/photo-1512058564366-18510be2db19",
            Instructions = "1. Nấu chín cơm gạo lứt.\n2. Thái mỏng thịt bò, ướp tỏi và gia vị.\n3. Xào nhanh thịt bò và ớt chuông trên lửa lớn.\n4. Bày ra đĩa ăn kèm cơm gạo lứt.",
            PrepTimeMinutes = 15,
            CookTimeMinutes = 10,
            Servings = 1,
            Difficulty = "Medium",
            CaloriesPerServing = 520,
            ProteinPerServing = 42,
            CarbsPerServing = 58,
            FatPerServing = 14
        };

        var r3 = new Recipe
        {
            Title = "Cháo yến mạch ức gà rau củ",
            Description = "Món ăn sáng nhẹ bụng, hỗ trợ giảm cân và cung cấp năng lượng bền bỉ cho cả buổi sáng.",
            ImageUrl = "https://images.unsplash.com/photo-1517673132405-a56a62b18caf",
            Instructions = "1. Luộc chín ức gà và xé nhỏ.\n2. Nấu yến mạch với nước dùng gà trong 5-7 phút.\n3. Thêm ức gà, nêm gia vị vừa ăn và rắc hành ngò.",
            PrepTimeMinutes = 5,
            CookTimeMinutes = 10,
            Servings = 1,
            Difficulty = "Easy",
            CaloriesPerServing = 320,
            ProteinPerServing = 28,
            CarbsPerServing = 36,
            FatPerServing = 5
        };

        var r4 = new Recipe
        {
            Title = "Cá hồi áp chảo măng tây và cà chua bi",
            Description = "Cá hồi béo ngậy giàu Omega-3 ăn kèm rau củ áp chảo thơm lừng bơ tỏi.",
            ImageUrl = "https://images.unsplash.com/photo-1467003909585-2f8a72700288",
            Instructions = "1. Rắc muối tiêu lên 2 mặt cá hồi.\n2. Áp chảo cá hồi mỗi mặt 3-4 phút đến khi vàng giòn da.\n3. Cho cà chua bi vào đảo nhanh và thưởng thức.",
            PrepTimeMinutes = 10,
            CookTimeMinutes = 8,
            Servings = 1,
            Difficulty = "Medium",
            CaloriesPerServing = 450,
            ProteinPerServing = 34,
            CarbsPerServing = 8,
            FatPerServing = 28
        };

        var r5 = new Recipe
        {
            Title = "Trứng cuộn rau củ thanh đạm",
            Description = "Món ăn nhanh gọn, bổ sung protein và chất xơ tuyệt vời cho bữa sáng hoặc bữa phụ.",
            ImageUrl = "https://images.unsplash.com/photo-1525351484163-7529414344d8",
            Instructions = "1. Đánh tan 2 quả trứng gà.\n2. Băm nhỏ ớt chuông, dưa leo.\n3. Trộn rau vào trứng và tráng mỏng trên chảo chống dính, cuộn tròn.",
            PrepTimeMinutes = 5,
            CookTimeMinutes = 5,
            Servings = 1,
            Difficulty = "Easy",
            CaloriesPerServing = 210,
            ProteinPerServing = 16,
            CarbsPerServing = 4,
            FatPerServing = 14
        };

        var r6 = new Recipe
        {
            Title = "Canh đậu hũ non nấu cà chua thịt bằm",
            Description = "Bát canh thanh mát giải nhiệt, dễ nấu, ít calo và phù hợp cho cả gia đình.",
            ImageUrl = "https://images.unsplash.com/photo-1547592166-23ac45744acd",
            Instructions = "1. Phi thơm hành tím, xào cà chua cho nhuyễn.\n2. Thêm nước đun sôi rồi thả đậu hũ cắt miếng vuông.\n3. Nêm nếm vừa ăn, rắc hành hoa rồi tắt bếp.",
            PrepTimeMinutes = 5,
            CookTimeMinutes = 8,
            Servings = 1,
            Difficulty = "Easy",
            CaloriesPerServing = 180,
            ProteinPerServing = 14,
            CarbsPerServing = 10,
            FatPerServing = 7
        };

        var recipes = new[] { r1, r2, r3, r4, r5, r6 };
        await db.Recipes.AddRangeAsync(recipes);
        await db.SaveChangesAsync();

        // 3. Link Recipe Ingredients
        var recipeIngredients = new List<RecipeIngredient>
        {
            new() { RecipeId = r1.Id, IngredientId = ingUcGa.Id, Amount = 150, Unit = "g" },
            new() { RecipeId = r1.Id, IngredientId = ingRauXaLach.Id, Amount = 100, Unit = "g" },
            new() { RecipeId = r1.Id, IngredientId = ingCaChua.Id, Amount = 50, Unit = "g" },
            new() { RecipeId = r1.Id, IngredientId = ingSotMeRang.Id, Amount = 20, Unit = "ml" },

            new() { RecipeId = r2.Id, IngredientId = ingThitBo.Id, Amount = 150, Unit = "g" },
            new() { RecipeId = r2.Id, IngredientId = ingGaoLut.Id, Amount = 150, Unit = "g" },
            new() { RecipeId = r2.Id, IngredientId = ingOtChuong.Id, Amount = 80, Unit = "g" },

            new() { RecipeId = r3.Id, IngredientId = ingYenMach.Id, Amount = 60, Unit = "g" },
            new() { RecipeId = r3.Id, IngredientId = ingUcGa.Id, Amount = 100, Unit = "g" },

            new() { RecipeId = r4.Id, IngredientId = ingCaHoi.Id, Amount = 180, Unit = "g" },
            new() { RecipeId = r4.Id, IngredientId = ingCaChua.Id, Amount = 60, Unit = "g" },

            new() { RecipeId = r5.Id, IngredientId = ingTrungGa.Id, Amount = 2, Unit = "quả" },
            new() { RecipeId = r5.Id, IngredientId = ingOtChuong.Id, Amount = 30, Unit = "g" },

            new() { RecipeId = r6.Id, IngredientId = ingDauHu.Id, Amount = 150, Unit = "g" },
            new() { RecipeId = r6.Id, IngredientId = ingCaChua.Id, Amount = 80, Unit = "g" },
        };
        await db.RecipeIngredients.AddRangeAsync(recipeIngredients);

        // 4. Link Recipe Tags
        var tagEatClean = db.Tags.FirstOrDefault(t => t.Id == 1);
        var tagHighProtein = db.Tags.FirstOrDefault(t => t.Id == 4);
        var tagQuickMeal = db.Tags.FirstOrDefault(t => t.Id == 5);

        if (tagEatClean != null && tagHighProtein != null && tagQuickMeal != null)
        {
            var recipeTags = new List<RecipeTag>
            {
                new() { RecipeId = r1.Id, TagId = tagEatClean.Id },
                new() { RecipeId = r1.Id, TagId = tagHighProtein.Id },
                new() { RecipeId = r2.Id, TagId = tagEatClean.Id },
                new() { RecipeId = r2.Id, TagId = tagHighProtein.Id },
                new() { RecipeId = r3.Id, TagId = tagEatClean.Id },
                new() { RecipeId = r3.Id, TagId = tagQuickMeal.Id },
                new() { RecipeId = r4.Id, TagId = tagHighProtein.Id },
                new() { RecipeId = r5.Id, TagId = tagQuickMeal.Id },
                new() { RecipeId = r6.Id, TagId = tagQuickMeal.Id },
            };
            await db.RecipeTags.AddRangeAsync(recipeTags);
        }
        }

        // 5. Seed Challenges if empty
        if (!db.Challenges.Any())
        {
            var challenges = new List<Challenge>
            {
                new()
                {
                    Title = "7 Ngày Uống Đủ 2L Nước",
                    Description = "Uống tối thiểu 2000ml nước mỗi ngày liên tục trong 7 ngày để thanh lọc cơ thể và tăng cường chuyển hóa.",
                    ImageUrl = "https://images.unsplash.com/photo-1550572017-ed22e43e2609",
                    DurationDays = 7,
                    RewardExp = 150,
                    RewardBadge = "Hydration Master",
                    IsActive = true
                },
                new()
                {
                    Title = "Eat Clean 14 Ngày",
                    Description = "Duy trì ghi chép đầy đủ nhật ký dinh dưỡng và ăn theo kế hoạch bữa ăn trong 14 ngày.",
                    ImageUrl = "https://images.unsplash.com/photo-1498837167922-ddd27525d352",
                    DurationDays = 14,
                    RewardExp = 300,
                    RewardBadge = "Clean Eater Pro",
                    IsActive = true
                },
                new()
                {
                    Title = "10.000 Bước Chân Mỗi Ngày",
                    Description = "Đạt mục tiêu 10.000 bước đi bộ/chạy bộ mỗi ngày cùng SmartMeal Health Sync.",
                    ImageUrl = "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8",
                    DurationDays = 5,
                    RewardExp = 200,
                    RewardBadge = "Speed Runner",
                    IsActive = true
                }
            };
            await db.Challenges.AddRangeAsync(challenges);
        }

        await db.SaveChangesAsync();
    }
}
