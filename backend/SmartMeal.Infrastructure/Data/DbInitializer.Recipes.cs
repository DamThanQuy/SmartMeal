namespace SmartMeal.Infrastructure.Data;

using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common;
using SmartMeal.Domain.Entities;

public static partial class DbInitializer
{
    private sealed record RecipeSeedItem(
        string Title,
        string Description,
        string ImageUrl,
        string Instructions,
        int PrepTimeMinutes,
        int CookTimeMinutes,
        int Servings,
        string Difficulty,
        bool IsPremium,
        string MealTypes,
        double CaloriesPerServing,
        double ProteinPerServing,
        double CarbsPerServing,
        double FatPerServing,
        string[] TagCodes,
        (string Name, string Category, string Unit, double Cal100, double Pro100, double Carbs100, double Fat100, double Amount)[] Ingredients
    );

    private static readonly RecipeSeedItem[] ExpandedRecipes =
    [
        // 1. Phở bò tái lăn Eat Clean
        new(
            "Phở bò tái lăn Eat Clean",
            "Phở bò nước dùng ngọt thanh từ xương hầm và củ quả, dùng bánh phở gạo lứt và bò tái lăn thơm lừng.",
            "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80",
            "1. Trụng bánh phở gạo lứt qua nước sôi.\n2. Xào nhanh thịt bò thăn với tỏi và gừng đập dập.\n3. Xếp bánh phở, thịt bò, hành hoa vào tô và chan nước dùng nóng hổi.",
            15, 15, 1, "Medium", false, "Breakfast,Lunch",
            420, 35, 48, 9,
            ["eatClean", "highProtein"],
            [
                ("Bánh phở gạo lứt", "Grain", "g", 130, 3, 28, 0.5, 150),
                ("Thịt bò thăn", "Meat", "g", 250, 26, 0, 15, 120),
                ("Hành tây và hành hoa", "Vegetable", "g", 30, 1, 7, 0.1, 40)
            ]
        ),

        // 2. Bún chả ức gà nướng áp chảo
        new(
            "Bún chả ức gà nướng áp chảo",
            "Phiên bản thanh nhẹ của bún chả Hà Nội với chả viên từ ức gà nạc ướp hành tiêu, ăn kèm bún gạo lứt và nước mắm chua ngọt.",
            "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80",
            "1. Băm nhỏ ức gà, trộn hành khô, tiêu và nước mắm, nặn viên dẹt.\n2. Áp chảo viên chả gà vàng thơm hai mặt.\n3. Pha nước mắm tỏi ớt chua ngọt loãng, ăn kèm bún gạo lứt và xà lách tươi.",
            15, 10, 1, "Easy", false, "Lunch,Dinner",
            390, 36, 45, 7,
            ["eatClean", "highProtein", "budget"],
            [
                ("Ức gà phi lê", "Meat", "g", 165, 31, 0, 3.6, 150),
                ("Bún gạo lứt", "Grain", "g", 125, 2.5, 27, 0.5, 150),
                ("Xà lách Romaine", "Vegetable", "g", 17, 1.2, 3.3, 0.3, 80)
            ]
        ),

        // 3. Bánh mì nguyên cám kẹp ức gà sốt bơ đậu phộng
        new(
            "Bánh mì nguyên cám ức gà sốt bơ đậu phộng",
            "Bữa sáng tiện lợi giàu năng lượng với bánh mì nguyên cám giòn rụm, ức gà xé ngọt mềm và sốt bơ đậu phộng béo bùi.",
            "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80",
            "1. Nướng giòn 2 lát bánh mì đen nguyên cám.\n2. Phết bơ đậu phộng nguyên chất lên lát bánh.\n3. Kẹp ức gà xé sợi, dưa chuột thái lát và rau mùi rồi thưởng thức.",
            5, 5, 1, "Easy", false, "Breakfast,Snack",
            360, 28, 38, 10,
            ["quick", "eatClean", "highProtein"],
            [
                ("Bánh mì nguyên cám", "Grain", "g", 250, 9, 48, 3.5, 70),
                ("Ức gà phi lê", "Meat", "g", 165, 31, 0, 3.6, 100),
                ("Bơ đậu phộng nguyên chất", "Spice", "g", 588, 25, 20, 50, 20),
                ("Dưa leo", "Vegetable", "g", 15, 0.7, 3.6, 0.1, 40)
            ]
        ),

        // 4. Xôi yến mạch hạt sen đậu xanh
        new(
            "Xôi yến mạch hạt sen đậu xanh",
            "Món xôi dinh dưỡng dẻo thơm từ yến mạch nguyên hạt kết hợp hạt sen bùi ngậy và đậu xanh thanh mát.",
            "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=600&q=80",
            "1. Hấp chín hạt sen tươi và đậu xanh cà vỏ.\n2. Nấu yến mạch cán dẹt với nước cốt dừa loãng và xíu muối.\n3. Trộn đều yến mạch với hạt sen, đậu xanh và rắc chút vừng rang.",
            10, 15, 1, "Medium", false, "Breakfast",
            310, 12, 52, 6,
            ["vegan", "vegetarian", "eatClean", "budget"],
            [
                ("Yến mạch cán dẹt", "Grain", "g", 389, 16.9, 66, 6.9, 70),
                ("Hạt sen tươi", "Grain", "g", 89, 4.1, 17, 0.5, 40),
                ("Đậu xanh cà vỏ", "Grain", "g", 105, 7, 19, 0.4, 30)
            ]
        ),

        // 5. Cháo yến mạch thịt bò bằm cà rốt
        new(
            "Cháo yến mạch thịt bò bằm cà rốt",
            "Cháo dinh dưỡng thơm ngọt tự nhiên, dễ tiêu hóa, cung cấp sắt và chất xơ tuyệt vời cho khởi đầu ngày mới.",
            "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80",
            "1. Xào sơ thịt bò bằm và cà rốt cắt hạt lựu với chút dầu ô liu.\n2. Cho nước dùng vào đun sôi rồi thả yến mạch vào khuấy đều trong 5 phút.\n3. Nêm xíu hạt nêm tiêu, rắc hành ngò thơm lừng.",
            10, 10, 1, "Easy", false, "Breakfast,Dinner",
            340, 26, 42, 7,
            ["eatClean", "highProtein"],
            [
                ("Yến mạch cán dẹt", "Grain", "g", 389, 16.9, 66, 6.9, 60),
                ("Thịt bò thăn", "Meat", "g", 250, 26, 0, 15, 90),
                ("Cà rốt", "Vegetable", "g", 41, 0.9, 10, 0.2, 50)
            ]
        ),

        // 6. Smoothie bowl chuối việt quất hạt chia
        new(
            "Smoothie bowl chuối việt quất hạt chia",
            "Bát sinh tố sánh mịn mát lạnh từ chuối đông lạnh, việt quất và sữa chua Hy Lạp, phủ hạt chia và granola giòn tan.",
            "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=600&q=80",
            "1. Xay nhuyễn chuối đông lạnh, việt quất và sữa chua Hy Lạp không đường.\n2. Đổ hỗn hợp ra tô sứ.\n3. Xếp dâu tây, hạt chia, hạnh nhân lát và granola lên bề mặt.",
            8, 0, 1, "Easy", false, "Breakfast,Snack",
            290, 14, 46, 6,
            ["quick", "eatClean", "vegetarian"],
            [
                ("Chuối tiêu", "Fruit", "g", 89, 1.1, 23, 0.3, 100),
                ("Quả việt quất", "Fruit", "g", 57, 0.7, 14, 0.3, 50),
                ("Sữa chua Hy Lạp", "Dairy", "g", 97, 9, 3.6, 5, 100),
                ("Hạt chia", "Grain", "g", 486, 17, 42, 31, 10)
            ]
        ),

        // 7. Trứng chần quả bơ bánh mì đen nướng
        new(
            "Trứng chần quả bơ bánh mì đen nướng",
            "Bữa sáng chuẩn phong cách châu Âu với bánh mì lúa mạch đen nướng giòn, bơ dầm sánh béo và trứng lòng đào béo ngậy.",
            "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
            "1. Nướng giòn lát bánh mì đen.\n2. Dầm nhuyễn nửa quả bơ chín cùng chút nước cốt chanh và muối tiêu.\n3. Chần trứng lòng đào trong nước sôi có giấm, đặt lên lớp bơ trên bánh mì.",
            5, 5, 1, "Easy", false, "Breakfast",
            330, 15, 26, 18,
            ["quick", "eatClean", "vegetarian", "lowCarb"],
            [
                ("Trứng gà", "Dairy", "quả", 155, 13, 1.1, 11, 2),
                ("Quả bơ sáp", "Fruit", "g", 160, 2, 8.5, 14.7, 80),
                ("Bánh mì nguyên cám", "Grain", "g", 250, 9, 48, 3.5, 60)
            ]
        ),

        // 8. Pancake yến mạch chuối mật ong
        new(
            "Pancake yến mạch chuối mật ong",
            "Bánh kếp mềm xốp hoàn toàn không dùng bột mì hay đường tinh luyện, thơm nức mùi quế và chuối chín.",
            "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80",
            "1. Xay nhuyễn yến mạch, 1 quả chuối tiêu, 1 quả trứng gà và xíu bột quế.\n2. Rán bánh trên chảo chống dính với lửa nhỏ đến khi hai mặt vàng ruộm.\n3. Rưới 1 thìa nhỏ mật ong nguyên chất và hoa quả tươi.",
            5, 8, 1, "Easy", false, "Breakfast,Snack",
            280, 11, 46, 5,
            ["quick", "eatClean", "vegetarian", "budget"],
            [
                ("Yến mạch cán dẹt", "Grain", "g", 389, 16.9, 66, 6.9, 50),
                ("Chuối tiêu", "Fruit", "g", 89, 1.1, 23, 0.3, 100),
                ("Trứng gà", "Dairy", "quả", 155, 13, 1.1, 11, 1)
            ]
        ),

        // 9. Bánh cuốn gạo lứt nhân thịt nấm mèo
        new(
            "Bánh cuốn gạo lứt nhân thịt nấm mèo",
            "Món bánh cuốn hấp dẫn từ bột gạo lứt mềm mượt, nhân thịt nạc băm xào nấm mèo giòn sần sật ít dầu mỡ.",
            "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80",
            "1. Tráng bánh cuốn từ hỗn hợp bột gạo lứt pha loãng.\n2. Cho nhân thịt bằm xào nấm mèo và hành tây vào giữa rồi cuộn lại.\n3. Thưởng thức cùng giá đỗ chần, rau thơm và nước mắm tỏi ớt nhẹ vị.",
            15, 15, 1, "Medium", false, "Breakfast,Lunch",
            350, 22, 48, 8,
            ["eatClean", "highProtein"],
            [
                ("Bột gạo lứt", "Grain", "g", 360, 7.5, 76, 2.5, 80),
                ("Thịt nạc thăn", "Meat", "g", 143, 21, 0, 6, 80),
                ("Nấm mèo", "Vegetable", "g", 25, 2, 7, 0.2, 20)
            ]
        ),

        // 10. Bún riêu cua bắp bò đậu hũ Eat Clean
        new(
            "Bún riêu cua bắp bò đậu hũ Eat Clean",
            "Tô bún riêu thơm nức mùi gạch cua đồng tự nhiên, ăn kèm thịt bắp bò mềm ngọt và đậu hũ non nướng nồi chiên không dầu.",
            "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=600&q=80",
            "1. Nấu nước dùng cua đồng tươi với cà chua và dấm bỗng chua dịu.\n2. Đậu hũ cắt miếng nướng giòn trong nồi chiên không dầu.\n3. Trụng bún gạo lứt, xếp bắp bò chần chín tới, đậu hũ và chan nước riêu cua.",
            20, 15, 1, "Medium", true, "Breakfast,Lunch",
            460, 38, 46, 14,
            ["eatClean", "highProtein"],
            [
                ("Bún gạo lứt", "Grain", "g", 125, 2.5, 27, 0.5, 150),
                ("Thịt bò thăn", "Meat", "g", 250, 26, 0, 15, 100),
                ("Đậu hũ non", "Vegetable", "g", 76, 8, 1.9, 4.8, 80),
                ("Cà chua bi", "Vegetable", "g", 18, 0.9, 3.9, 0.2, 60),
                ("Cua đồng", "Seafood", "g", 87, 12.3, 2, 3.3, 100)
            ]
        ),

        // 11. Cơm gạo lứt cá hồi sốt Teriyaki
        new(
            "Cơm gạo lứt cá hồi sốt Teriyaki",
            "Cá hồi phi lê áp chảo sốt teriyaki mặn ngọt nhẹ ăn cùng cơm gạo lứt dẻo thơm và súp lơ xanh hấp.",
            "https://images.unsplash.com/photo-1546069901-d8a436578051?auto=format&fit=crop&w=600&q=80",
            "1. Áp chảo cá hồi với chút dầu olive đến khi xém cạnh.\n2. Rưới sốt teriyaki ít đường đun sệt lại phủ đều miếng cá.\n3. Xếp ra đĩa cùng cơm gạo lứt nóng và súp lơ xanh luộc giòn ngọt.",
            10, 12, 1, "Medium", true, "Lunch,Dinner",
            510, 36, 48, 18,
            ["eatClean", "highProtein"],
            [
                ("Cá hồi phi lê", "Seafood", "g", 208, 20, 0, 13, 150),
                ("Gạo lứt đỏ", "Grain", "g", 111, 2.6, 23, 0.9, 130),
                ("Súp lơ xanh", "Vegetable", "g", 34, 2.8, 7, 0.4, 80)
            ]
        ),

        // 12. Cơm gạo lứt ức gà xào nấm đông cô
        new(
            "Cơm gạo lứt ức gà xào nấm đông cô",
            "Thịt ức gà thái mỏng xào cùng nấm đông cô và hành tây đậm đà, bổ sung protein tinh khiết cho gymer.",
            "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80",
            "1. Ướp ức gà với xì dầu, tiêu và gừng băm.\n2. Phi thơm tỏi, cho ức gà và nấm đông cô vào xào chín tới.\n3. Dùng kèm cơm gạo lứt dẻo thơm và dưa chuột thái lát.",
            10, 10, 1, "Easy", false, "Lunch,Dinner",
            430, 40, 46, 8,
            ["eatClean", "highProtein", "budget"],
            [
                ("Ức gà phi lê", "Meat", "g", 165, 31, 0, 3.6, 150),
                ("Gạo lứt đỏ", "Grain", "g", 111, 2.6, 23, 0.9, 120),
                ("Nấm đông cô", "Vegetable", "g", 34, 2.2, 7, 0.5, 60)
            ]
        ),

        // 13. Miến dong xào tôm nõn rau củ thập cẩm
        new(
            "Miến dong xào tôm nõn rau củ thập cẩm",
            "Sợi miến dong dai giòn không bị nát, xào cùng tôm nõn tươi giòn ngọt, cà rốt và mộc nhĩ thanh mát.",
            "https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=600&q=80",
            "1. Ngâm mềm miến dong rồi trần sơ qua nước sôi.\n2. Xào săn tôm nõn với tỏi băm, sau đó cho cà rốt, nấm mèo vào xào chung.\n3. Cho miến vào đảo đều tay trên lửa lớn, nêm dầu hào vừa vị rồi rắc hành ngò.",
            15, 8, 1, "Medium", false, "Lunch,Dinner",
            370, 26, 52, 5,
            ["eatClean"],
            [
                ("Miến dong", "Grain", "g", 332, 0.5, 82, 0.2, 70),
                ("Tôm tươi", "Seafood", "g", 99, 24, 0.2, 0.3, 100),
                ("Cà rốt", "Vegetable", "g", 41, 0.9, 10, 0.2, 50)
            ]
        ),

        // 14. Bún bò xào Nam Bộ rau sống đậu phộng
        new(
            "Bún bò xào Nam Bộ rau sống đậu phộng",
            "Món bún trộn thanh đạm đặc trưng miền Nam với thịt bò xào thơm nức, rau thơm tươi giòn và đậu phộng rang.",
            "https://images.unsplash.com/photo-1503764654157-72d979d9af2f?auto=format&fit=crop&w=600&q=80",
            "1. Ướp thịt bò thái mỏng với tỏi, sả và dầu hào ít muối.\n2. Xào nhanh thịt bò trên lửa to trong 2 phút.\n3. Xếp bún gạo lứt, rau xà lách, giá đỗ, thịt bò lên tô và rắc đậu phộng rang giã nhỏ.",
            15, 8, 1, "Easy", false, "Lunch,Dinner",
            450, 34, 54, 11,
            ["eatClean", "highProtein"],
            [
                ("Thịt bò thăn", "Meat", "g", 250, 26, 0, 15, 120),
                ("Bún gạo lứt", "Grain", "g", 125, 2.5, 27, 0.5, 150),
                ("Xà lách Romaine", "Vegetable", "g", 17, 1.2, 3.3, 0.3, 80),
                ("Đậu phộng rang", "Grain", "g", 585, 24, 21, 50, 15)
            ]
        ),

        // 15. Cơm gạo lứt sườn nướng mật ong thảo mộc
        new(
            "Cơm gạo lứt sườn nướng mật ong thảo mộc",
            "Sườn heo nạc ướp mật ong và hương thảo nướng giòn bằng nồi chiên không dầu, ăn kèm dưa muối xổi ít đường.",
            "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
            "1. Ướp sườn với tỏi, tiêu, chút mật ong và thảo mộc trong 20 phút.\n2. Nướng sườn ở 180 độ C trong 15 phút, lật mặt nướng thêm 5 phút.\n3. Bày ra đĩa ăn cùng cơm gạo lứt và salad dưa chuột cà chua.",
            20, 20, 1, "Medium", false, "Lunch,Dinner",
            490, 32, 47, 18,
            ["highProtein", "eatClean"],
            [
                ("Sườn heo nạc", "Meat", "g", 230, 20, 0, 16, 150),
                ("Gạo lứt đỏ", "Grain", "g", 111, 2.6, 23, 0.9, 130),
                ("Dưa leo", "Vegetable", "g", 15, 0.7, 3.6, 0.1, 50)
            ]
        ),

        // 16. Cá thu sốt cà chua ít béo thì là
        new(
            "Cá thu sốt cà chua ít béo thì là",
            "Khúc cá thu chắc nạc giàu Omega-3 sốt đẫm cà chua đỏ mọng và thì là dậy mùi thơm ngào ngạt.",
            "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80",
            "1. Áp chảo cá thu vàng sơ hai mặt.\n2. Xào nhuyễn cà chua với chút dầu ô liu và nước mắm truyền thống.\n3. Cho cá vào đun liu riu 10 phút ngấm vị, thả thì là hành lá rồi tắt bếp.",
            10, 15, 1, "Easy", false, "Lunch,Dinner",
            380, 33, 12, 22,
            ["keto", "lowCarb", "highProtein"],
            [
                ("Cá thu", "Seafood", "g", 205, 19, 0, 14, 150),
                ("Cà chua bi", "Vegetable", "g", 18, 0.9, 3.9, 0.2, 100),
                ("Thì là", "Vegetable", "g", 43, 3.5, 7, 1.1, 20)
            ]
        ),

        // 17. Tôm sú rim dừa non thịt nạc thăn
        new(
            "Tôm sú rim dừa non thịt nạc thăn",
            "Món mặn truyền thống với tôm tươi ngọt kết hợp thịt nạc thăn mềm ngấm vị nước dừa tươi thanh nhẹ.",
            "https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&w=600&q=80",
            "1. Thịt nạc thăn thái mỏng xào sơ cùng tỏi băm.\n2. Cho tôm sú đã lột vỏ vào đảo đều đến khi tôm chuyển đỏ.\n3. Thêm nước dừa tươi đun cạn nhẹ, nêm tiêu và hành lá.",
            10, 12, 1, "Easy", false, "Lunch,Dinner",
            360, 38, 14, 16,
            ["highProtein", "lowCarb", "eatClean"],
            [
                ("Tôm tươi", "Seafood", "g", 99, 24, 0.2, 0.3, 120),
                ("Thịt nạc thăn", "Meat", "g", 143, 21, 0, 6, 90)
            ]
        ),

        // 18. Ức gà cuộn măng tây nướng mật ong
        new(
            "Ức gà cuộn măng tây nướng mật ong",
            "Ức gà đập mỏng cuộn lấy cọng măng tây giòn ngọt, nướng xém cạnh vàng thơm hấp dẫn.",
            "https://images.unsplash.com/photo-1606728035253-49e8a23146de?auto=format&fit=crop&w=600&q=80",
            "1. Lọc mỏng ức gà, dần nhẹ rồi ướp chút muối tiêu.\n2. Đặt măng tây vào giữa, cuộn tròn và cố định bằng tăm.\n3. Nướng nồi chiên không dầu ở 180 độ C trong 12 phút, phết xíu mật ong phút cuối.",
            15, 12, 1, "Medium", false, "Lunch,Dinner",
            320, 38, 12, 12,
            ["keto", "lowCarb", "highProtein", "eatClean"],
            [
                ("Ức gà phi lê", "Meat", "g", 165, 31, 0, 3.6, 160),
                ("Măng tây", "Vegetable", "g", 20, 2.2, 3.9, 0.1, 80)
            ]
        ),

        // 19. Bún gạo lứt trộn tôm thịt sốt chua ngọt
        new(
            "Bún gạo lứt trộn tôm thịt sốt chua ngọt",
            "Món bún trộn mùa hè thanh mát với tôm luộc nõn, thịt nạc luộc xắt sợi, rau sống và nước sốt chua cay kích thích vị giác.",
            "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80",
            "1. Luộc chín tôm và thịt nạc thăn, thái sợi vừa ăn.\n2. Trụng bún gạo lứt để ráo nước.\n3. Trộn đều bún với tôm thịt, xà lách, rau thơm và nước sốt giấm táo chua ngọt.",
            15, 10, 1, "Easy", false, "Lunch,Dinner",
            390, 34, 48, 6,
            ["eatClean", "highProtein"],
            [
                ("Bún gạo lứt", "Grain", "g", 125, 2.5, 27, 0.5, 140),
                ("Tôm tươi", "Seafood", "g", 99, 24, 0.2, 0.3, 100),
                ("Thịt nạc thăn", "Meat", "g", 143, 21, 0, 6, 60),
                ("Xà lách Romaine", "Vegetable", "g", 17, 1.2, 3.3, 0.3, 80)
            ]
        ),

        // 20. Bò lúc lắc khoai lang mật nướng
        new(
            "Bò lúc lắc khoai lang mật nướng",
            "Thịt bò thăn cắt vuông xào lửa lớn giữ trọn vị ngọt tự nhiên, ăn cùng khoai lang mật nướng bùi thơm.",
            "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80",
            "1. Cắt thịt bò hạt lựu to, ướp tỏi, dầu hào và tiêu đen.\n2. Khoai lang cắt khúc nướng chín vàng trong nồi chiên không dầu.\n3. Xào bò lúc lắc cùng ớt chuông và hành tây trên lửa to trong 3 phút rồi bày ra đĩa.",
            15, 15, 1, "Medium", true, "Lunch,Dinner",
            480, 39, 42, 16,
            ["highProtein", "eatClean"],
            [
                ("Thịt bò thăn", "Meat", "g", 250, 26, 0, 15, 150),
                ("Khoai lang", "Grain", "g", 86, 1.6, 20, 0.1, 130),
                ("Ớt chuông đỏ", "Vegetable", "g", 31, 1, 6, 0.3, 60)
            ]
        ),

        // 21. Canh chua cá lóc rau muống bắp chuối
        new(
            "Canh chua cá lóc rau muống bắp chuối",
            "Hương vị đồng quê miền Tây ngọt lịm từ cá lóc đồng, chua thanh từ me tươi và giòn mát từ rau muống, hoa chuối.",
            "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80",
            "1. Nấu nước sôi, dầm me lấy nước chua rồi thả cá lóc cắt khúc vào đun chín.\n2. Thêm cà chua, đậu bắp, rau muống và hoa chuối thái sợi.\n3. Nêm nước mắm vừa ăn, rắc rau ngổ ngò gai dậy mùi.",
            15, 15, 1, "Easy", false, "Lunch,Dinner",
            240, 28, 16, 5,
            ["eatClean", "budget"],
            [
                ("Cá lóc", "Seafood", "g", 97, 18.2, 0, 2.7, 150),
                ("Cà chua bi", "Vegetable", "g", 18, 0.9, 3.9, 0.2, 60)
            ]
        ),

        // 22. Canh rong biển đậu hũ non thịt bằm
        new(
            "Canh rong biển đậu hũ non thịt bằm",
            "Bát canh thanh mát giải độc cơ thể, giàu i-ốt và canxi từ rong biển khô kết hợp đậu hũ non mềm mịn.",
            "https://images.unsplash.com/photo-1607528971899-2e89e6c0ec69?auto=format&fit=crop&w=600&q=80",
            "1. Ngâm nở rong biển khô rồi rửa sạch vắt ráo.\n2. Xào săn thịt nạc bằm với chút hành khô và dầu mè.\n3. Thêm nước sôi, thả đậu hũ cắt vuông và rong biển, đun sôi 3 phút rồi nêm gia vị.",
            10, 8, 1, "Easy", false, "Lunch,Dinner",
            210, 20, 8, 10,
            ["lowCarb", "eatClean"],
            [
                ("Đậu hũ non", "Vegetable", "g", 76, 8, 1.9, 4.8, 120),
                ("Thịt nạc thăn", "Meat", "g", 143, 21, 0, 6, 60)
            ]
        ),

        // 23. Bò áp chảo sốt tiêu đen măng tây baby
        new(
            "Bò áp chảo sốt tiêu đen măng tây baby",
            "Thịt thăn bò mềm mọng nước áp chảo sốt tiêu đen đậm đà, dùng kèm măng tây baby giòn ngọt chuẩn vị nhà hàng.",
            "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
            "1. Áp chảo thịt bò thăn mỗi mặt 2-3 phút tùy độ chín mong muốn.\n2. Làm nóng chảo với sốt tiêu đen nấu cùng chút bơ lạt.\n3. Xào sơ măng tây baby rồi rưới sốt tiêu đen lên đĩa thịt bò.",
            10, 8, 1, "Medium", true, "Lunch,Dinner",
            460, 42, 12, 26,
            ["keto", "lowCarb", "highProtein"],
            [
                ("Thịt bò thăn", "Meat", "g", 250, 26, 0, 15, 180),
                ("Măng tây", "Vegetable", "g", 20, 2.2, 3.9, 0.1, 80)
            ]
        ),

        // 24. Mực nang hấp gừng sả chấm mắm ớt
        new(
            "Mực nang hấp gừng sả chấm mắm ớt",
            "Mực nang tươi giòn ngọt tự nhiên hấp cùng gừng tươi và sả đập dập thơm lừng, món ăn giàu đạm ít calo.",
            "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80",
            "1. Làm sạch mực nang, khứa vảy rồng trên thân.\n2. Lót gừng sả thái lát dưới đáy xửng hấp, đặt mực lên trên.\n3. Hấp cách thủy trên lửa lớn 7-8 phút tới khi mực chín giòn.",
            10, 8, 1, "Easy", false, "Lunch,Dinner",
            220, 34, 4, 6,
            ["keto", "lowCarb", "highProtein"],
            [
                ("Mực tươi", "Seafood", "g", 92, 15.6, 3, 1.4, 200)
            ]
        ),

        // 25. Cá chẽm nướng giấy bạc thảo mộc chanh vàng
        new(
            "Cá chẽm nướng giấy bạc thảo mộc chanh vàng",
            "Phi lê cá chẽm tươi trắng muốt được bọc giấy bạc nướng cùng dầu ô liu, lát chanh vàng và lá hương thảo thơm dịu.",
            "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80",
            "1. Đặt phi lê cá chẽm lên tấm giấy bạc lớn.\n2. Rắc muối tiêu, xếp lát chanh vàng và ngọn hương thảo lên trên cá.\n3. Gói kín giấy bạc, nướng ở 200 độ C trong 15 phút.",
            8, 15, 1, "Easy", true, "Dinner",
            310, 35, 3, 16,
            ["keto", "lowCarb", "highProtein", "eatClean"],
            [
                ("Cá chẽm", "Seafood", "g", 125, 20, 0, 4.5, 170)
            ]
        ),

        // 26. Canh gà hầm củ sen táo đỏ hạt sen
        new(
            "Canh gà hầm củ sen táo đỏ hạt sen",
            "Món canh hầm dưỡng sinh bồi bổ cơ thể, giúp an thần ngủ ngon với thịt gà nạc, củ sen bùi và táo đỏ ngọt lành.",
            "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80",
            "1. Chặt gà thành miếng vừa ăn, chần qua nước sôi khử mùi.\n2. Cho gà, củ sen thái lát, hạt sen và táo đỏ vào nồi hầm với 1 lít nước.\n3. Hầm nhỏ lửa trong 30 phút, nêm chút muối hột thanh vị.",
            15, 30, 2, "Medium", false, "Dinner",
            350, 32, 30, 9,
            ["eatClean", "highProtein"],
            [
                ("Ức gà phi lê", "Meat", "g", 165, 31, 0, 3.6, 160),
                ("Hạt sen tươi", "Grain", "g", 89, 4.1, 17, 0.5, 40)
            ]
        ),

        // 27. Đậu hũ nhồi thịt hấp sốt cà chua hành hoa
        new(
            "Đậu hũ nhồi thịt hấp sốt cà chua hành hoa",
            "Đậu hũ trắng nhồi thịt nạc băm nấm hương, hấp chín rồi sốt đẫm cà chua thanh dịu, dễ ăn và giàu dinh dưỡng.",
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
            "1. Rạch giữa bìa đậu hũ, nhồi hỗn hợp thịt bằm trộn mộc nhĩ nấm hương.\n2. Hấp đậu hũ trong 12 phút cho chín phần nhân thịt.\n3. Làm sốt cà chua sệt, cho đậu hũ vào rim 3 phút rồi rắc hành ngò.",
            15, 15, 1, "Medium", false, "Lunch,Dinner",
            310, 26, 14, 15,
            ["eatClean", "highProtein", "budget"],
            [
                ("Đậu hũ non", "Vegetable", "g", 76, 8, 1.9, 4.8, 150),
                ("Thịt nạc thăn", "Meat", "g", 143, 21, 0, 6, 80),
                ("Cà chua bi", "Vegetable", "g", 18, 0.9, 3.9, 0.2, 80)
            ]
        ),

        // 28. Bò cuộn nấm kim châm nướng sốt tương
        new(
            "Bò cuộn nấm kim châm nướng sốt tương",
            "Từng cuộn thịt bò ba chỉ bò nạc cuộn chặt nấm kim châm giòn sần sật, nướng xèo xèo thơm ngất ngây.",
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
            "1. Trải lát thịt bò dài, cho nấm kim châm vào giữa rồi cuộn tròn chặt tay.\n2. Pha sốt tương tỏi gồm xì dầu, dầu hào và chút đường ăn kiêng.\n3. Nướng cuộn bò trong nồi chiên không dầu 8 phút, phết sốt tương trong 2 phút cuối.",
            12, 8, 1, "Easy", false, "Lunch,Dinner",
            340, 30, 8, 20,
            ["keto", "lowCarb", "highProtein"],
            [
                ("Thịt bò thăn", "Meat", "g", 250, 26, 0, 15, 130),
                ("Nấm kim châm", "Vegetable", "g", 37, 2.7, 7.8, 0.3, 100)
            ]
        ),

        // 29. Cá điêu hồng hấp xì dầu gừng thì là
        new(
            "Cá điêu hồng hấp xì dầu gừng thì là",
            "Thịt cá điêu hồng ngọt thơm hấp cùng gừng tươi thái chỉ và thì là, rưới xì dầu nóng hổi đậm đà khó cưỡng.",
            "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80",
            "1. Làm sạch cá, khứa chéo thân cá và xoa chút muối tiêu gừng.\n2. Hấp cá cách thủy 12 phút tới khi cá chín tới.\n3. Phi thơm gừng ớt thì là với dầu ăn, thêm xì dầu đun sôi rồi rưới lên mình cá.",
            10, 15, 2, "Medium", false, "Lunch,Dinner",
            290, 34, 6, 14,
            ["eatClean", "highProtein", "lowCarb"],
            [
                ("Cá điêu hồng", "Seafood", "g", 128, 20.1, 0, 5.2, 180),
                ("Thì là", "Vegetable", "g", 43, 3.5, 7, 1.1, 30)
            ]
        ),

        // 30. Canh bí đỏ hầm sườn non ít béo
        new(
            "Canh bí đỏ hầm sườn non ít béo",
            "Vị ngọt bùi tan trong miệng của bí đỏ hồ lô hòa quyện cùng nước hầm sườn non trong vắt bổ dưỡng.",
            "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80",
            "1. Chần sườn non qua nước sôi rồi ninh với 800ml nước trong 20 phút.\n2. Cắt bí đỏ thành miếng vuông vừa ăn, cho vào ninh cùng sườn 10 phút.\n3. Nêm gia vị vừa miệng, rắc hành ngò thơm lừng.",
            10, 25, 2, "Easy", false, "Lunch,Dinner",
            260, 22, 22, 9,
            ["eatClean", "budget"],
            [
                ("Sườn heo nạc", "Meat", "g", 230, 20, 0, 16, 120),
                ("Bí đỏ", "Vegetable", "g", 26, 1, 6.5, 0.1, 150)
            ]
        ),

        // 31. Salad cầu vồng bơ hạt dẻ sốt chanh leo
        new(
            "Salad cầu vồng bơ hạt dẻ sốt chanh leo",
            "Bản giao hưởng màu sắc từ bắp cải tím, cà rốt, bơ sáp, ngô ngọt và hạt dẻ cười với sốt chanh leo thanh mát.",
            "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
            "1. Bào sợi bắp cải tím và cà rốt, bơ cắt hạt lựu.\n2. Pha nước cốt chanh leo với dầu olive và thìa nhỏ mật ong làm sốt.\n3. Trộn đều các nguyên liệu rau củ, rưới sốt chanh leo và rắc hạt dẻ cười đập giập.",
            10, 0, 1, "Easy", false, "Lunch,Dinner,Snack",
            240, 6, 28, 14,
            ["vegan", "vegetarian", "eatClean", "quick"],
            [
                ("Quả bơ sáp", "Fruit", "g", 160, 2, 8.5, 14.7, 80),
                ("Cà rốt", "Vegetable", "g", 41, 0.9, 10, 0.2, 50),
                ("Xà lách Romaine", "Vegetable", "g", 17, 1.2, 3.3, 0.3, 60),
                ("Hạt dẻ cười", "Grain", "g", 560, 20, 28, 45, 15)
            ]
        ),

        // 32. Đậu hũ kho nấm bào ngư tiêu xanh
        new(
            "Đậu hũ kho nấm bào ngư tiêu xanh",
            "Món chay thanh tao đậm vị với đậu hũ chiên mềm thấm đẫm nước sốt tương thơm lừng nấm bào ngư và tiêu sọ tươi.",
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
            "1. Cắt đậu hũ miếng vuông, áp chảo vàng nhẹ các mặt.\n2. Xào thơm nấm bào ngư với hành baro và tiêu xanh đập dập.\n3. Cho đậu hũ vào kho cùng nước tương và chút nước dừa trong 10 phút đến khi sánh sệt.",
            10, 12, 1, "Easy", false, "Lunch,Dinner",
            230, 16, 15, 11,
            ["vegan", "vegetarian", "eatClean", "budget"],
            [
                ("Đậu hũ non", "Vegetable", "g", 76, 8, 1.9, 4.8, 150),
                ("Nấm bào ngư", "Vegetable", "g", 33, 3.3, 6.4, 0.4, 100)
            ]
        ),

        // 33. Canh nấm ngũ sắc hạt sen thuần chay
        new(
            "Canh nấm ngũ sắc hạt sen thuần chay",
            "Bát canh dưỡng tâm an thần với nấm hương, nấm đùi gà, nấm rơm, cà rốt và hạt sen ninh nhừ ngọt mát.",
            "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80",
            "1. Ninh hạt sen tươi với nước trong 15 phút cho mềm bùi.\n2. Thêm cà rốt tỉa hoa và các loại nấm tươi cắt khúc vừa ăn.\n3. Đun sôi thêm 5 phút, nêm hạt nêm chay nấm hương và rắc ngò gai.",
            12, 20, 2, "Easy", false, "Lunch,Dinner",
            180, 9, 32, 2,
            ["vegan", "vegetarian", "eatClean"],
            [
                ("Hạt sen tươi", "Grain", "g", 89, 4.1, 17, 0.5, 50),
                ("Nấm đông cô", "Vegetable", "g", 34, 2.2, 7, 0.5, 60),
                ("Cà rốt", "Vegetable", "g", 41, 0.9, 10, 0.2, 40)
            ]
        ),

        // 34. Cơm súp lơ trắng gà áp chảo sốt mè (Keto)
        new(
            "Cơm súp lơ trắng gà áp chảo sốt mè (Keto)",
            "Giải pháp thay thế cơm hoàn hảo cho người ăn kiêng Keto: súp lơ trắng xay nhuyễn xào thơm ăn cùng ức gà mềm ngọt.",
            "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80",
            "1. Xay nhỏ súp lơ trắng như hạt cơm rồi đảo nhanh trên chảo nóng với chút bơ lạt.\n2. Áp chảo ức gà vàng giòn hai mặt rồi cắt lát xéo.\n3. Xếp gà lên đĩa cơm súp lơ và rưới sốt mè rang béo ngậy.",
            10, 10, 1, "Easy", false, "Lunch,Dinner",
            340, 38, 8, 16,
            ["keto", "lowCarb", "highProtein", "eatClean"],
            [
                ("Ức gà phi lê", "Meat", "g", 165, 31, 0, 3.6, 140),
                ("Súp lơ trắng", "Vegetable", "g", 25, 1.9, 5, 0.3, 160),
                ("Sốt mè rang", "Spice", "ml", 387, 2.5, 18, 34, 20)
            ]
        ),

        // 35. Bò bít tết bơ tỏi măng tây (Keto)
        new(
            "Bò bít tết bơ tỏi măng tây (Keto)",
            "Thịt thăn bò hảo hạng áp chảo bơ tỏi thơm ngào ngạt, giữ nguyên độ mềm mọng tự nhiên của thớ thịt.",
            "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80",
            "1. Thấm khô miếng bò, xoa đều muối biển và tiêu hạt giã dập.\n2. Đun nóng chảo gang, áp chảo mỗi mặt 2 phút cùng tỏi tép đập dập và cành hương thảo.\n3. Cho bơ lạt vào chảo rưới liên tục lên mặt thịt rồi để thịt nghỉ 5 phút trước khi cắt.",
            5, 6, 1, "Medium", true, "Lunch,Dinner",
            480, 44, 4, 31,
            ["keto", "lowCarb", "highProtein", "quick"],
            [
                ("Thịt bò thăn", "Meat", "g", 250, 26, 0, 15, 200),
                ("Măng tây", "Vegetable", "g", 20, 2.2, 3.9, 0.1, 80)
            ]
        ),

        // 36. Salad tôm bơ trứng luộc sốt mè rang
        new(
            "Salad tôm bơ trứng luộc sốt mè rang",
            "Món salad tràn ngập năng lượng tốt từ tôm hấp giòn, bơ chín béo ngậy, trứng luộc lòng đào và xà lách sạch.",
            "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
            "1. Luộc chín tôm lột vỏ, trứng gà luộc 6 phút lòng đào bổ đôi.\n2. Cắt lát bơ chín và cà chua bi, xà lách rửa sạch để ráo.\n3. Xếp các nguyên liệu ra đĩa lớn và rưới sốt mè rang thơm phức.",
            10, 6, 1, "Easy", false, "Lunch,Dinner",
            370, 28, 12, 24,
            ["keto", "lowCarb", "highProtein"],
            [
                ("Tôm tươi", "Seafood", "g", 99, 24, 0.2, 0.3, 100),
                ("Quả bơ sáp", "Fruit", "g", 160, 2, 8.5, 14.7, 80),
                ("Trứng gà", "Dairy", "quả", 155, 13, 1.1, 11, 1),
                ("Xà lách Romaine", "Vegetable", "g", 17, 1.2, 3.3, 0.3, 70),
                ("Sốt mè rang", "Spice", "ml", 387, 2.5, 18, 34, 25)
            ]
        ),

        // 37. Gỏi cuốn tôm thịt bánh tráng gạo lứt
        new(
            "Gỏi cuốn tôm thịt bánh tráng gạo lứt",
            "Những cuốn gỏi tròn trịa mát lành từ tôm sú, thịt nạc luộc và đủ loại rau thơm ghém trong bánh tráng gạo lứt dẻo dai.",
            "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80",
            "1. Luộc chín tôm và thịt nạc, thịt thái mỏng, tôm xẻ đôi theo chiều dọc.\n2. Nhúng ướt bánh tráng gạo lứt, xếp rau sống, bún gạo lứt, tôm thịt vào giữa.\n3. Cuộn chặt tay và chấm cùng sốt tương bơ đậu phộng đậm đà.",
            15, 10, 1, "Easy", false, "Lunch,Dinner,Snack",
            320, 25, 40, 6,
            ["eatClean", "highProtein"],
            [
                ("Tôm tươi", "Seafood", "g", 99, 24, 0.2, 0.3, 100),
                ("Thịt nạc thăn", "Meat", "g", 143, 21, 0, 6, 60),
                ("Xà lách Romaine", "Vegetable", "g", 17, 1.2, 3.3, 0.3, 60)
            ]
        ),

        // 38. Đậu phụ chiên nồi chiên không dầu sốt sả ớt
        new(
            "Đậu phụ chiên nồi chiên không dầu sốt sả ớt",
            "Bìa đậu giòn rụm bên ngoài mọng nước bên trong hoàn toàn không ngấy dầu, quyện sốt sả ớt cay nồng bắt cơm.",
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
            "1. Đậu phụ thấm ráo nước, cắt miếng vuông vừa ăn.\n2. Xếp vào nồi chiên không dầu nướng 190 độ C trong 15 phút đến khi vàng giòn.\n3. Phi thơm sả ớt băm, thêm xíu xì dầu rồi đảo nhanh đậu phụ vào cho ngấm.",
            8, 15, 1, "Easy", false, "Lunch,Dinner",
            220, 18, 9, 12,
            ["vegan", "vegetarian", "budget", "eatClean"],
            [
                ("Đậu hũ non", "Vegetable", "g", 76, 8, 1.9, 4.8, 160)
            ]
        ),

        // 39. Miến xào nấm đùi gà cà rốt chay
        new(
            "Miến xào nấm đùi gà cà rốt chay",
            "Miến dong xào tơi mềm cùng nấm đùi gà thái sợi giòn ngọt, cà rốt và mộc nhĩ thanh nhẹ dễ ăn.",
            "https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=600&q=80",
            "1. Ngâm miến dong nở mềm cắt đoạn ngắn.\n2. Xào nấm đùi gà thái sợi, cà rốt và nấm mèo với dầu mè trên chảo nóng.\n3. Trút miến vào đảo đều tay cùng dầu hào chay, rắc tiêu và hành hoa.",
            12, 8, 1, "Easy", false, "Lunch,Dinner",
            310, 10, 58, 4,
            ["vegan", "vegetarian", "budget"],
            [
                ("Miến dong", "Grain", "g", 332, 0.5, 82, 0.2, 70),
                ("Cà rốt", "Vegetable", "g", 41, 0.9, 10, 0.2, 40)
            ]
        ),

        // 40. Canh bóng mộc thập cẩm hoa súp lơ
        new(
            "Canh bóng mộc thập cẩm hoa súp lơ",
            "Bát canh ngũ sắc truyền thống thanh tao với giò sống nạc viên tròn, bóng bì giòn mềm, súp lơ và cà rốt tỉa hoa.",
            "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80",
            "1. Đun sôi nước dùng xương gà lọc trong vắt.\n2. Viên từng viên mọc thịt nạc thả vào nồi cùng bóng bì đã ngâm mềm thái xéo.\n3. Thêm súp lơ xanh, súp lơ trắng và cà rốt vào đun chín tới, rắc ngò thơm.",
            15, 12, 2, "Medium", false, "Lunch,Dinner",
            280, 26, 18, 9,
            ["eatClean", "highProtein"],
            [
                ("Thịt nạc thăn", "Meat", "g", 143, 21, 0, 6, 90),
                ("Súp lơ xanh", "Vegetable", "g", 34, 2.8, 7, 0.4, 60),
                ("Cà rốt", "Vegetable", "g", 41, 0.9, 10, 0.2, 40)
            ]
        ),

        // 41. Sữa chua Hy Lạp mix dâu tây granola hạt óc chó
        new(
            "Sữa chua Hy Lạp mix dâu tây granola hạt óc chó",
            "Món ăn nhẹ chuẩn xu hướng healthy với sữa chua Hy Lạp sánh đặc giàu probiotic, dâu tây mọng đỏ và hạt óc chó giòn bùi.",
            "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80",
            "1. Múc 150g sữa chua Hy Lạp không đường ra ly thủy tinh.\n2. Xếp dâu tây tươi cắt lát xung quanh.\n3. Rắc granola yến mạch và hạt óc chó bẻ nhỏ lên trên, thưởng thức ngay.",
            5, 0, 1, "Easy", false, "Breakfast,Snack",
            270, 18, 25, 11,
            ["quick", "eatClean", "vegetarian", "highProtein"],
            [
                ("Sữa chua Hy Lạp", "Dairy", "g", 97, 9, 3.6, 5, 150),
                ("Yến mạch cán dẹt", "Grain", "g", 389, 16.9, 66, 6.9, 30),
                ("Hạt óc chó", "Grain", "g", 654, 15, 14, 65, 15)
            ]
        ),

        // 42. Bánh chuối yến mạch nướng quế không đường
        new(
            "Bánh chuối yến mạch nướng quế không đường",
            "Món bánh ăn vặt lành mạnh ngọt tự nhiên từ chuối sứ chín muồi, giàu chất xơ từ yến mạch và thơm ấm nồng vị bột quế.",
            "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
            "1. Dầm nát 2 quả chuối chín, trộn đều với 1 quả trứng, 100g yến mạch cán và thìa bột quế.\n2. Đổ bột vào khuôn có lót giấy nến nướng bánh.\n3. Nướng ở 175 độ C trong 20 phút đến khi bánh chín vàng thơm nức.",
            10, 20, 4, "Easy", false, "Snack,Breakfast",
            190, 6, 34, 3,
            ["eatClean", "vegetarian", "budget"],
            [
                ("Chuối tiêu", "Fruit", "g", 89, 1.1, 23, 0.3, 120),
                ("Yến mạch cán dẹt", "Grain", "g", 389, 16.9, 66, 6.9, 60),
                ("Trứng gà", "Dairy", "quả", 155, 13, 1.1, 11, 1)
            ]
        ),

        // 43. Chè hạt sen long nhãn táo đỏ đường ăn kiêng
        new(
            "Chè hạt sen long nhãn táo đỏ đường ăn kiêng",
            "Chè thanh nhiệt giải khát bổ dưỡng với hạt sen bùi ngậy lồng bên trong cùi nhãn giòn ngọt nước.",
            "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
            "1. Hấp chín hạt sen tươi, bóc vỏ nhãn tươi và lồng hạt sen vào trong cùi nhãn.\n2. Đun sôi nước cùng lá dứa và táo đỏ thái lát.\n3. Thả long nhãn hạt sen vào đun thêm 3 phút, nêm đường ăn kiêng cỏ ngọt rồi tắt bếp.",
            15, 15, 2, "Medium", false, "Snack",
            160, 4, 36, 1,
            ["vegan", "vegetarian", "eatClean"],
            [
                ("Hạt sen tươi", "Grain", "g", 89, 4.1, 17, 0.5, 60)
            ]
        ),

        // 44. Sinh tố bơ sữa dừa hạt chia Keto
        new(
            "Sinh tố bơ sữa dừa hạt chia Keto",
            "Ly sinh tố ngậy béo giàu chất béo tốt không bão hòa từ bơ sáp và sữa dừa, hoàn hảo cho chế độ ăn Low-Carb / Keto.",
            "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80",
            "1. Nạo lấy phần thịt nửa quả bơ sáp chín dẻo.\n2. Cho bơ, 100ml sữa cốt dừa không đường, đá viên và chút đường ăn kiêng vào cối xay mịn.\n3. Rót ra ly và rắc hạt chia ngâm nở lên bề mặt.",
            5, 0, 1, "Easy", false, "Breakfast,Snack",
            260, 4, 6, 26,
            ["keto", "lowCarb", "quick", "vegetarian"],
            [
                ("Quả bơ sáp", "Fruit", "g", 160, 2, 8.5, 14.7, 100),
                ("Hạt chia", "Grain", "g", 486, 17, 42, 31, 10)
            ]
        ),

        // 45. Pudding hạt chia sữa hạnh nhân xoài cát
        new(
            "Pudding hạt chia sữa hạnh nhân xoài cát",
            "Bữa phụ thơm ngậy mát lịm với hạt chia nở xốp trong sữa hạnh nhân béo nhẹ, ăn kèm từng viên xoài cát ngọt lịm.",
            "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=600&q=80",
            "1. Trộn đều 3 thìa hạt chia vào 150ml sữa hạnh nhân không đường, để ngăn mát tủ lạnh 2 tiếng.\n2. Cắt xoài cát chín thành từng hạt lựu nhỏ.\n3. Cho xoài lên trên cốc pudding hạt chia và thưởng thức mát lạnh.",
            5, 0, 1, "Easy", false, "Snack,Breakfast",
            180, 6, 24, 8,
            ["vegan", "vegetarian", "quick", "eatClean"],
            [
                ("Hạt chia", "Grain", "g", 486, 17, 42, 31, 25),
                // Không đặt tên "sữa hạnh nhân": từ khóa "sữa" sẽ gắn nhầm dị ứng sữa bò cho món thuần chay.
                ("Nước hạnh nhân không đường", "Grain", "ml", 15, 0.6, 0.3, 1.2, 150)
            ]
        ),

        // 46. Thanh ngũ cốc Granola mật ong hạt điều
        new(
            "Thanh ngũ cốc Granola mật ong hạt điều",
            "Thanh năng lượng tiện lợi bỏ túi làm từ yến mạch nướng giòn quyện mật ong hoa rừng và hạt điều thơm bùi.",
            "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
            "1. Trộn đều yến mạch cán dẹt, hạt điều giã dập, hạt bí xanh và mật ong nguyên chất.\n2. Ép chặt hỗn hợp vào khay nướng lót giấy nến.\n3. Nướng 160 độ C trong 15 phút, để nguội hoàn toàn rồi cắt thành từng thanh chữ nhật.",
            10, 15, 5, "Easy", false, "Snack",
            210, 7, 26, 10,
            ["eatClean", "vegetarian", "budget"],
            [
                ("Yến mạch cán dẹt", "Grain", "g", 389, 16.9, 66, 6.9, 80),
                ("Hạt điều", "Grain", "g", 553, 18, 30, 44, 40)
            ]
        ),

        // 47. Salad cá ngừ áp chảo sốt mù tạt mật ong
        new(
            "Salad cá ngừ áp chảo sốt mù tạt mật ong",
            "Cá ngừ đại dương tươi áp chảo xém viền ngoài, thịt trong đỏ hồng mềm ngọt kết hợp xà lách giòn mát và sốt Dijon honey.",
            "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
            "1. Lăn phi lê cá ngừ qua mè đen mè trắng và muối tiêu.\n2. Áp chảo cá ngừ mỗi mặt 1 phút trên lửa to để lòng cá còn hồng mọng.\n3. Thái lát cá ngừ, xếp lên đĩa rau xà lách xoong và rưới sốt mù tạt mật ong.",
            10, 3, 1, "Medium", true, "Lunch,Dinner",
            360, 42, 8, 16,
            ["highProtein", "lowCarb", "keto", "quick"],
            [
                ("Cá ngừ", "Seafood", "g", 130, 29, 0, 0.6, 150),
                ("Xà lách Romaine", "Vegetable", "g", 17, 1.2, 3.3, 0.3, 80),
                ("Cà chua bi", "Vegetable", "g", 18, 0.9, 3.9, 0.2, 50)
            ]
        ),

        // 48. Bánh mì nướng bơ tỏi kẹp phô mai ít béo
        new(
            "Bánh mì nướng bơ tỏi kẹp phô mai ít béo",
            "Bánh mì nướng giòn rụm thơm nức mũi bơ tỏi quyện phô mai mozzarella chảy sợi dẻo dai hấp dẫn khó chối từ.",
            "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80",
            "1. Trộn bơ lạt với tỏi băm và lá mùi tây thái nhỏ.\n2. Phết bơ tỏi lên 2 mặt bánh mì nguyên cám, rắc phô mai ít béo vào giữa.\n3. Nướng trong nồi chiên không dầu 5 phút ở 180 độ C cho phô mai tan chảy.",
            5, 5, 1, "Easy", false, "Breakfast,Snack",
            310, 16, 32, 13,
            ["quick", "vegetarian"],
            [
                ("Bánh mì nguyên cám", "Grain", "g", 250, 9, 48, 3.5, 70),
                ("Phô mai mozzarella ít béo", "Dairy", "g", 254, 24, 3, 16, 30)
            ]
        ),

        // 49. Trứng tráng ngải cứu thịt bằm bồi bổ
        new(
            "Trứng tráng ngải cứu thịt bằm bồi bổ",
            "Món ăn dân dã bồi bổ khí huyết với trứng gà đánh tan cùng lá ngải cứu tươi non và thịt nạc băm đậm đà.",
            "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
            "1. Lá ngải cứu rửa sạch thái nhỏ, băm nhỏ thịt nạc heo.\n2. Đánh tan 2 quả trứng gà cùng ngải cứu, thịt bằm, chút nước mắm và tiêu.\n3. Rán trên chảo chống dính với lửa vừa đến khi hai mặt vàng ươm.",
            8, 6, 1, "Easy", false, "Breakfast,Dinner",
            260, 22, 4, 17,
            ["quick", "keto", "lowCarb", "budget"],
            [
                ("Trứng gà", "Dairy", "quả", 155, 13, 1.1, 11, 2),
                ("Thịt nạc thăn", "Meat", "g", 143, 21, 0, 6, 50)
            ]
        ),

        // 50. Nước ép cần tây táo xanh dưa leo giải độc
        new(
            "Nước ép cần tây táo xanh dưa leo giải độc",
            "Ly nước ép xanh mướt mát lạnh giàu khoáng chất và chất chống oxy hóa, hỗ trợ đốt mỡ và thanh lọc đường ruột.",
            "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80",
            "1. Rửa sạch cần tây, táo xanh và dưa leo, ngâm nước muối loãng.\n2. Cắt khúc vừa họng máy ép chậm.\n3. Ép kiệt bã, thêm vài giọt nước cốt chanh tươi và uống liền cùng đá viên.",
            8, 0, 1, "Easy", false, "Breakfast,Snack",
            95, 2, 22, 0.5,
            ["vegan", "vegetarian", "quick", "eatClean"],
            [
                ("Dưa leo", "Vegetable", "g", 15, 0.7, 3.6, 0.1, 100)
            ]
        )
    ];

    private static async Task EnsureExpandedRecipesAsync(ApplicationDbContext db)
    {
        var existingTitles = (await db.Recipes.Select(r => r.Title).ToListAsync())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var tagsByCode = await db.Tags.AsNoTracking().ToDictionaryAsync(t => t.Code, t => t.Id, StringComparer.OrdinalIgnoreCase);

        var existingIngredients = await db.Ingredients.ToListAsync();
        var ingredientCache = existingIngredients
            .GroupBy(i => i.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        Ingredient GetOrCreateIngredient(string name, string category, string unit, double cal, double pro, double carbs, double fat)
        {
            if (ingredientCache.TryGetValue(name, out var existing)) return existing;
            var ing = new Ingredient
            {
                Name = name,
                Category = category,
                DefaultUnit = unit,
                CaloriesPer100g = cal,
                ProteinPer100g = pro,
                CarbsPer100g = carbs,
                FatPer100g = fat,
                IsVerified = true,
                SearchText = TextNormalizer.Fold(name).Trim()
            };
            db.Ingredients.Add(ing);
            ingredientCache[name] = ing;
            return ing;
        }

        var newRecipes = new List<Recipe>();
        var newRecipeTags = new List<RecipeTag>();
        var newRecipeIngredients = new List<RecipeIngredient>();

        foreach (var seed in ExpandedRecipes)
        {
            if (existingTitles.Contains(seed.Title)) continue;

            var recipe = new Recipe
            {
                Title = seed.Title,
                Description = seed.Description,
                ImageUrl = seed.ImageUrl,
                Instructions = seed.Instructions,
                PrepTimeMinutes = seed.PrepTimeMinutes,
                CookTimeMinutes = seed.CookTimeMinutes,
                Servings = seed.Servings,
                Difficulty = seed.Difficulty,
                IsPremium = seed.IsPremium,
                MealTypes = seed.MealTypes,
                CaloriesPerServing = seed.CaloriesPerServing,
                ProteinPerServing = seed.ProteinPerServing,
                CarbsPerServing = seed.CarbsPerServing,
                FatPerServing = seed.FatPerServing,
                CreatedAt = DateTime.UtcNow
            };

            newRecipes.Add(recipe);

            foreach (var tagCode in seed.TagCodes)
            {
                if (tagsByCode.TryGetValue(tagCode, out var tagId))
                {
                    newRecipeTags.Add(new RecipeTag { RecipeId = recipe.Id, TagId = tagId });
                }
            }

            foreach (var ingDef in seed.Ingredients)
            {
                var ing = GetOrCreateIngredient(ingDef.Name, ingDef.Category, ingDef.Unit, ingDef.Cal100, ingDef.Pro100, ingDef.Carbs100, ingDef.Fat100);
                newRecipeIngredients.Add(new RecipeIngredient
                {
                    RecipeId = recipe.Id,
                    IngredientId = ing.Id,
                    Amount = ingDef.Amount,
                    Unit = ingDef.Unit
                });
            }
        }

        if (newRecipes.Count > 0)
        {
            await db.Recipes.AddRangeAsync(newRecipes);
            await db.RecipeTags.AddRangeAsync(newRecipeTags);
            await db.RecipeIngredients.AddRangeAsync(newRecipeIngredients);
            await db.SaveChangesAsync();
        }

        // DB đã seed ở bản trước không tạo lại món đã có, nên sửa tại chỗ các món đó theo danh sách seed hiện tại:
        // - bù nguyên liệu còn thiếu (vd. món "... đậu phộng" thiếu đậu phộng thì không được gắn dị ứng — BR-102);
        // - gỡ nhãn "quick" mà seed đã bỏ khi món thực tế nấu quá 15 phút.
        // Chỉ bù/gỡ đúng hai điểm này (không xóa nguyên liệu nào) nên chạy lại an toàn.
        var seededBefore = ExpandedRecipes.Where(s => existingTitles.Contains(s.Title)).ToList();
        if (seededBefore.Count == 0) return;

        var seededTitles = seededBefore.Select(s => s.Title).ToList();
        var recipeIdByTitle = (await db.Recipes.AsNoTracking()
                .Where(r => seededTitles.Contains(r.Title))
                .Select(r => new { r.Id, r.Title })
                .ToListAsync())
            .GroupBy(r => r.Title, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().Id, StringComparer.OrdinalIgnoreCase);
        var recipeIds = recipeIdByTitle.Values.ToList();
        var linkedIngredients = (await db.RecipeIngredients.AsNoTracking()
                .Where(ri => recipeIds.Contains(ri.RecipeId))
                .Select(ri => new { ri.RecipeId, ri.Ingredient.Name })
                .ToListAsync())
            .Select(x => (x.RecipeId, Name: x.Name.ToLowerInvariant()))
            .ToHashSet();

        var missingLinks = new List<RecipeIngredient>();
        var staleQuickRecipeIds = new List<Guid>();
        foreach (var seed in seededBefore)
        {
            if (!recipeIdByTitle.TryGetValue(seed.Title, out var recipeId)) continue;

            foreach (var ingDef in seed.Ingredients.Where(i => !linkedIngredients.Contains((recipeId, i.Name.ToLowerInvariant()))))
            {
                var ing = GetOrCreateIngredient(ingDef.Name, ingDef.Category, ingDef.Unit, ingDef.Cal100, ingDef.Pro100, ingDef.Carbs100, ingDef.Fat100);
                missingLinks.Add(new RecipeIngredient { RecipeId = recipeId, IngredientId = ing.Id, Amount = ingDef.Amount, Unit = ingDef.Unit });
            }

            if (!seed.TagCodes.Contains(QuickTagCode, StringComparer.OrdinalIgnoreCase))
            {
                staleQuickRecipeIds.Add(recipeId);
            }
        }

        if (missingLinks.Count > 0)
        {
            await db.RecipeIngredients.AddRangeAsync(missingLinks);
            await db.SaveChangesAsync();
        }

        if (staleQuickRecipeIds.Count > 0 && tagsByCode.TryGetValue(QuickTagCode, out var quickTagId))
        {
            await db.RecipeTags
                .Where(rt => rt.TagId == quickTagId
                             && staleQuickRecipeIds.Contains(rt.RecipeId)
                             && rt.Recipe.PrepTimeMinutes + rt.Recipe.CookTimeMinutes > QuickTagMaxMinutes)
                .ExecuteDeleteAsync();
        }
    }

    /// <summary>Nhãn "Nhanh Gọn (&lt; 15 phút)": chỉ hợp với món có tổng thời gian sơ chế + nấu tối đa 15 phút.</summary>
    private const string QuickTagCode = "quick";
    private const int QuickTagMaxMinutes = 15;
}
