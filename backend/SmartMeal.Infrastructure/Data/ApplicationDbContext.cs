using Microsoft.EntityFrameworkCore;
using SmartMeal.Domain.Entities;

namespace SmartMeal.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<HealthProfile> HealthProfiles => Set<HealthProfile>();
    public DbSet<WeightHistory> WeightHistories => Set<WeightHistory>();
    public DbSet<Allergy> Allergies => Set<Allergy>();
    public DbSet<UserAllergy> UserAllergies => Set<UserAllergy>();
    public DbSet<MedicalCondition> MedicalConditions => Set<MedicalCondition>();
    public DbSet<UserCondition> UserConditions => Set<UserCondition>();
    public DbSet<UserDietaryPreference> UserDietaryPreferences => Set<UserDietaryPreference>();
    public DbSet<Ingredient> Ingredients => Set<Ingredient>();
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<RecipeIngredient> RecipeIngredients => Set<RecipeIngredient>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<RecipeTag> RecipeTags => Set<RecipeTag>();
    public DbSet<NutritionDiary> NutritionDiaries => Set<NutritionDiary>();
    public DbSet<DiaryItem> DiaryItems => Set<DiaryItem>();
    public DbSet<MealPlan> MealPlans => Set<MealPlan>();
    public DbSet<GroceryItem> GroceryItems => Set<GroceryItem>();
    public DbSet<UserFavorite> UserFavorites => Set<UserFavorite>();
    public DbSet<OtpVerification> OtpVerifications => Set<OtpVerification>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<WaterLog> WaterLogs => Set<WaterLog>();
    public DbSet<HealthSyncLog> HealthSyncLogs => Set<HealthSyncLog>();
    public DbSet<HealthPet> HealthPets => Set<HealthPet>();
    public DbSet<Challenge> Challenges => Set<Challenge>();
    public DbSet<UserChallenge> UserChallenges => Set<UserChallenge>();
    public DbSet<RecipeCollection> RecipeCollections => Set<RecipeCollection>();
    public DbSet<CollectionRecipe> CollectionRecipes => Set<CollectionRecipe>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // CollectionRecipe (N-N)
        modelBuilder.Entity<CollectionRecipe>()
            .HasKey(cr => new { cr.CollectionId, cr.RecipeId });

        modelBuilder.Entity<CollectionRecipe>()
            .HasOne(cr => cr.Collection)
            .WithMany(c => c.CollectionRecipes)
            .HasForeignKey(cr => cr.CollectionId);

        modelBuilder.Entity<CollectionRecipe>()
            .HasOne(cr => cr.Recipe)
            .WithMany()
            .HasForeignKey(cr => cr.RecipeId);

        // User Indexes
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // NutritionDiary: mỗi (người dùng, ngày, bữa) chỉ có đúng một dòng nhóm. Ràng buộc này chặn việc
        // các request song song tạo dòng trùng làm món "biến mất" khỏi /daily (P1-BE-12).
        modelBuilder.Entity<NutritionDiary>()
            .HasIndex(d => new { d.UserId, d.LogDate, d.MealType })
            .IsUnique();

        modelBuilder.Entity<WaterLog>()
            .HasIndex(w => new { w.UserId, w.LogDate });

        // HealthSyncLog: mỗi (người dùng, ngày, nguồn) một bản ghi — gửi lại thì thay thế, không nhân đôi (P1-BE-09).
        modelBuilder.Entity<HealthSyncLog>()
            .HasIndex(l => new { l.UserId, l.SyncDate, l.Source })
            .IsUnique();

        // Một tài khoản Google chỉ liên kết với một tài khoản SmartMeal (BR-012); NULL được phép lặp.
        modelBuilder.Entity<User>()
            .HasIndex(u => u.GoogleId)
            .IsUnique();

        // RefreshToken: tra theo bản băm; xóa người dùng thì xóa luôn các phiên.
        modelBuilder.Entity<RefreshToken>()
            .HasIndex(t => t.TokenHash)
            .IsUnique();

        modelBuilder.Entity<RefreshToken>()
            .HasIndex(t => t.UserId);

        modelBuilder.Entity<RefreshToken>()
            .HasOne(t => t.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // User - HealthProfile (1-1)
        modelBuilder.Entity<HealthProfile>()
            .HasOne(hp => hp.User)
            .WithOne(u => u.HealthProfile)
            .HasForeignKey<HealthProfile>(hp => hp.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // UserAllergy (N-N)
        modelBuilder.Entity<UserAllergy>()
            .HasKey(ua => new { ua.HealthProfileId, ua.AllergyId });

        modelBuilder.Entity<UserAllergy>()
            .HasOne(ua => ua.HealthProfile)
            .WithMany(hp => hp.UserAllergies)
            .HasForeignKey(ua => ua.HealthProfileId);

        modelBuilder.Entity<UserAllergy>()
            .HasOne(ua => ua.Allergy)
            .WithMany(a => a.UserAllergies)
            .HasForeignKey(ua => ua.AllergyId);

        // UserCondition (N-N)
        modelBuilder.Entity<UserCondition>()
            .HasKey(uc => new { uc.HealthProfileId, uc.MedicalConditionId });

        modelBuilder.Entity<UserCondition>()
            .HasOne(uc => uc.HealthProfile)
            .WithMany(hp => hp.UserConditions)
            .HasForeignKey(uc => uc.HealthProfileId);

        modelBuilder.Entity<UserCondition>()
            .HasOne(uc => uc.MedicalCondition)
            .WithMany(mc => mc.UserConditions)
            .HasForeignKey(uc => uc.MedicalConditionId);

        // RecipeIngredient (N-N)
        modelBuilder.Entity<RecipeIngredient>()
            .HasKey(ri => new { ri.RecipeId, ri.IngredientId });

        modelBuilder.Entity<RecipeIngredient>()
            .HasOne(ri => ri.Recipe)
            .WithMany(r => r.RecipeIngredients)
            .HasForeignKey(ri => ri.RecipeId);

        modelBuilder.Entity<RecipeIngredient>()
            .HasOne(ri => ri.Ingredient)
            .WithMany(i => i.RecipeIngredients)
            .HasForeignKey(ri => ri.IngredientId);

        // RecipeTag (N-N)
        modelBuilder.Entity<RecipeTag>()
            .HasKey(rt => new { rt.RecipeId, rt.TagId });

        modelBuilder.Entity<RecipeTag>()
            .HasOne(rt => rt.Recipe)
            .WithMany(r => r.RecipeTags)
            .HasForeignKey(rt => rt.RecipeId);

        modelBuilder.Entity<RecipeTag>()
            .HasOne(rt => rt.Tag)
            .WithMany(t => t.RecipeTags)
            .HasForeignKey(rt => rt.TagId);

        // UserFavorite (N-N)
        modelBuilder.Entity<UserFavorite>()
            .HasKey(uf => new { uf.UserId, uf.RecipeId });

        modelBuilder.Entity<UserFavorite>()
            .HasOne(uf => uf.User)
            .WithMany(u => u.Favorites)
            .HasForeignKey(uf => uf.UserId);

        modelBuilder.Entity<UserFavorite>()
            .HasOne(uf => uf.Recipe)
            .WithMany(r => r.Favorites)
            .HasForeignKey(uf => uf.RecipeId);

        // UserDietaryPreference (N-N giữa hồ sơ và Tag)
        modelBuilder.Entity<UserDietaryPreference>()
            .HasKey(up => new { up.HealthProfileId, up.TagId });

        modelBuilder.Entity<UserDietaryPreference>()
            .HasOne(up => up.HealthProfile)
            .WithMany(hp => hp.DietaryPreferences)
            .HasForeignKey(up => up.HealthProfileId);

        modelBuilder.Entity<UserDietaryPreference>()
            .HasOne(up => up.Tag)
            .WithMany()
            .HasForeignKey(up => up.TagId);

        // Mã (Code) ổn định, duy nhất cho từng danh mục: client dùng thay cho id/tên hiển thị.
        modelBuilder.Entity<Allergy>().HasIndex(a => a.Code).IsUnique();
        modelBuilder.Entity<MedicalCondition>().HasIndex(c => c.Code).IsUnique();
        modelBuilder.Entity<Tag>().HasIndex(t => t.Code).IsUnique();

        // Seed Allergies & Conditions & Tags. Id đã phát hành không được đổi (client lưu theo id/code).
        modelBuilder.Entity<Allergy>().HasData(
            new Allergy { Id = 1, Code = "seafood", Name = "Hải sản (Seafood)", Description = "Tôm, cua, ốc, mực" },
            new Allergy { Id = 2, Code = "peanut", Name = "Đậu phộng (Peanuts)", Description = "Lạc và chế phẩm từ lạc" },
            new Allergy { Id = 3, Code = "dairy", Name = "Sữa động vật (Dairy)", Description = "Sữa bò, phô mai, bơ" },
            new Allergy { Id = 4, Code = "egg", Name = "Trứng (Eggs)", Description = "Trứng gà, trứng vịt" },
            new Allergy { Id = 5, Code = "gluten", Name = "Gluten (Lúa mì)", Description = "Bánh mì, mì ý bột mì" },
            new Allergy { Id = 6, Code = "soy", Name = "Đậu nành (Soy)", Description = "Đậu phụ, sữa đậu nành" },
            new Allergy { Id = 7, Code = "treeNut", Name = "Các loại hạt (Tree nuts)", Description = "Hạnh nhân, óc chó, hạt điều, hạt dẻ" },
            new Allergy { Id = 8, Code = "sesame", Name = "Mè (Sesame)", Description = "Hạt mè, dầu mè, sốt mè" }
        );

        modelBuilder.Entity<MedicalCondition>().HasData(
            new MedicalCondition { Id = 1, Code = "diabetes", Name = "Tiểu đường (Diabetes)", Description = "Hạn chế đường và carbs hấp thu nhanh" },
            new MedicalCondition { Id = 2, Code = "gout", Name = "Gout (Axit Uric cao)", Description = "Hạn chế purin (nội tạng, thịt đỏ, hải sản)" },
            new MedicalCondition { Id = 3, Code = "hypertension", Name = "Cao huyết áp (Hypertension)", Description = "Chế độ ăn giảm muối Natri (DASH)" },
            new MedicalCondition { Id = 4, Code = "dyslipidemia", Name = "Mỡ máu cao (Dyslipidemia)", Description = "Hạn chế mỡ bão hòa và cholesterol" }
        );

        modelBuilder.Entity<Tag>().HasData(
            new Tag { Id = 1, Code = "eatClean", Name = "Eat Clean" },
            new Tag { Id = 2, Code = "keto", Name = "Keto" },
            new Tag { Id = 3, Code = "vegan", Name = "Thuần Chay (Vegan)" },
            new Tag { Id = 4, Code = "highProtein", Name = "Tăng Cơ (High Protein)" },
            new Tag { Id = 5, Code = "quick", Name = "Nhanh Gọn (< 15 phút)" },
            new Tag { Id = 6, Code = "budget", Name = "Tiết Kiệm Ngân Sách" },
            new Tag { Id = 7, Code = "lowCarb", Name = "Low-Carb" },
            new Tag { Id = 8, Code = "vegetarian", Name = "Ăn Chay (Vegetarian)" }
        );
    }
}
