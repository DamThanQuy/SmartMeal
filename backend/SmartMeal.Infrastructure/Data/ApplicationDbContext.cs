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

        // Seed Allergies & Conditions & Tags
        modelBuilder.Entity<Allergy>().HasData(
            new Allergy { Id = 1, Name = "Hải sản (Seafood)", Description = "Tôm, cua, ốc, mực" },
            new Allergy { Id = 2, Name = "Đậu phộng (Peanuts)", Description = "Lạc và chế phẩm từ lạc" },
            new Allergy { Id = 3, Name = "Sữa động vật (Dairy)", Description = "Sữa bò, phô mai, bơ" },
            new Allergy { Id = 4, Name = "Trứng (Eggs)", Description = "Trứng gà, trứng vịt" },
            new Allergy { Id = 5, Name = "Gluten (Lúa mì)", Description = "Bánh mì, mì ý bột mì" },
            new Allergy { Id = 6, Name = "Đậu nành (Soy)", Description = "Đậu phụ, sữa đậu nành" }
        );

        modelBuilder.Entity<MedicalCondition>().HasData(
            new MedicalCondition { Id = 1, Name = "Tiểu đường (Diabetes)", Description = "Hạn chế đường và carbs hấp thu nhanh" },
            new MedicalCondition { Id = 2, Name = "Gout (Axit Uric cao)", Description = "Hạn chế purin (nội tạng, thịt đỏ, hải sản)" },
            new MedicalCondition { Id = 3, Name = "Cao huyết áp (Hypertension)", Description = "Chế độ ăn giảm muối Natri (DASH)" },
            new MedicalCondition { Id = 4, Name = "Mỡ máu cao (Dyslipidemia)", Description = "Hạn chế mỡ bão hòa và cholesterol" }
        );

        modelBuilder.Entity<Tag>().HasData(
            new Tag { Id = 1, Name = "Eat Clean" },
            new Tag { Id = 2, Name = "Keto" },
            new Tag { Id = 3, Name = "Thuần Chay (Vegan)" },
            new Tag { Id = 4, Name = "Tăng Cơ (High Protein)" },
            new Tag { Id = 5, Name = "Nhanh Gọn (< 15 phút)" },
            new Tag { Id = 6, Name = "Tiết Kiệm Ngân Sách" }
        );
    }
}
