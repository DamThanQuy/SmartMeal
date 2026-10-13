using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;
using SmartMeal.Infrastructure.Services;

// Nạp file .env (chỉ dùng khi chạy local). Môi trường thật tiêm biến môi trường trực tiếp.
DotNetEnv.Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

// 1. Options — bí mật (Jwt:Key, chuỗi kết nối, Gemini key) chỉ đến từ biến môi trường / .env / User Secrets.
// Cấu hình được đọc lazy (lúc resolve) nên test và môi trường tiêm cấu hình sau vẫn có hiệu lực.
builder.Services
    .AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .ValidateDataAnnotations()
    .Validate(
        o => builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing") || !o.LooksLikePublishedSampleKey(),
        "Jwt:Key đang là giá trị mẫu đã công khai — hãy sinh khóa ngẫu nhiên mới (vd. openssl rand -base64 48).")
    .ValidateOnStart();

builder.Services
    .AddOptions<AuthOptions>()
    .Bind(builder.Configuration.GetSection(AuthOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// 2. Database (PostgreSQL)
builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
{
    var connectionString = sp.GetRequiredService<IConfiguration>().GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException(
            "Thiếu ConnectionStrings:DefaultConnection — đặt biến môi trường ConnectionStrings__DefaultConnection (hoặc file .env, xem .env.example).");
    }

    options.UseNpgsql(connectionString);
});

// 3. Dependency Injection
builder.Services.AddSingleton<IGoogleTokenVerifier, GoogleTokenVerifier>();
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<ILoginAttemptTracker, LoginAttemptTracker>();
builder.Services.AddScoped<IAccountService, AccountService>();

builder.Services.Configure<SubscriptionOptions>(builder.Configuration.GetSection(SubscriptionOptions.SectionName));

// File người dùng tải lên (ảnh đại diện) lưu cục bộ dưới Storage:Root và phục vụ tĩnh tại /uploads.
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection(StorageOptions.SectionName));
builder.Services.AddSingleton<IFileStorage, LocalFileStorage>();

// Gửi email: SMTP thật khi có Smtp:Host, ngược lại chỉ ghi log (Development in cả mã OTP).
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));
builder.Services.AddSingleton<IEmailSender>(sp =>
{
    var smtp = sp.GetRequiredService<IOptions<SmtpOptions>>();
    return string.IsNullOrWhiteSpace(smtp.Value.Host)
        ? ActivatorUtilities.CreateInstance<LogOnlyEmailSender>(sp)
        : ActivatorUtilities.CreateInstance<SmtpEmailSender>(sp, smtp);
});
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IHealthProfileService, HealthProfileService>();
builder.Services.AddScoped<IRecipeService, RecipeService>();
builder.Services.AddScoped<INutritionDiaryService, NutritionDiaryService>();
builder.Services.AddScoped<IMealPlannerService, MealPlannerService>();
builder.Services.AddScoped<IGroceryService, GroceryService>();
builder.Services.AddScoped<IHealthSyncService, HealthSyncService>();
builder.Services.AddScoped<IGamificationService, GamificationService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IFoodService, FoodService>();
builder.Services.AddHttpClient<IAiVisionService, GeminiAiVisionService>(client => client.Timeout = TimeSpan.FromSeconds(45));
builder.Services.AddScoped<IAiQuotaService, AiQuotaService>();
builder.Services
    .AddOptions<AiOptions>()
    .Bind(builder.Configuration.GetSection(AiOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// 4. JWT Authentication (khóa, issuer, audience đọc từ JwtOptions — cùng nguồn với JwtTokenService)
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer();

builder.Services
    .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOptions>>((bearer, jwtAccessor) =>
    {
        var jwt = jwtAccessor.Value;
        bearer.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        // 401/403 trả envelope ApiResponse thay vì body rỗng.
        bearer.Events = new JwtBearerEvents
        {
            // Token còn hạn nhưng tài khoản đã bị xóa → từ chối ngay (thay vì lỗi khóa ngoại ở các thao tác sau).
            OnTokenValidated = async context =>
            {
                if (!Guid.TryParse(context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                {
                    context.Fail("invalid_subject");
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
                if (!await db.Users.AsNoTracking().AnyAsync(u => u.Id == userId, context.HttpContext.RequestAborted))
                {
                    context.Fail("user_not_found");
                }
            },
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.Headers.Append("WWW-Authenticate", "Bearer");
                var expired = context.AuthenticateFailure is SecurityTokenExpiredException;
                await ApiErrorWriter.WriteAsync(
                    context.HttpContext,
                    StatusCodes.Status401Unauthorized,
                    expired ? "Phiên đăng nhập đã hết hạn." : ApiErrorWriter.DefaultMessage(StatusCodes.Status401Unauthorized),
                    expired ? new List<string> { "token_expired" } : null);
            },
            OnForbidden = context => ApiErrorWriter.WriteAsync(
                context.HttpContext,
                StatusCodes.Status403Forbidden,
                ApiErrorWriter.DefaultMessage(StatusCodes.Status403Forbidden))
        };
    });

// 5. CORS — app di động native không cần CORS. Development mở tự do; môi trường khác chỉ cho các origin
// khai báo ở Cors:AllowedOrigins (phân tách bằng dấu phẩy, vd. app web Expo).
var corsOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Default", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
        }
        else if (corsOrigins.Length > 0)
        {
            policy.WithOrigins(corsOrigins).AllowAnyMethod().AllowAnyHeader();
        }
    });
});

// 6. Controllers — lỗi validate/binding và lỗi chưa xử lý đều trả envelope ApiResponse thống nhất
builder.Services
    .AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = ModelStateErrorResponse.Create;
    });

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// Giới hạn tần suất theo IP cho các endpoint xác thực (chống dò mật khẩu/spam OTP). Quá giới hạn → 429 envelope.
// Chạy sau reverse proxy thì cấu hình ForwardedHeaders để RemoteIpAddress là IP thật của client.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, _) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
        }

        await ApiErrorWriter.WriteAsync(
            context.HttpContext,
            StatusCodes.Status429TooManyRequests,
            ApiErrorWriter.DefaultMessage(StatusCodes.Status429TooManyRequests));
    };

    options.AddPolicy(RateLimitPolicies.Auth, httpContext =>
    {
        var permitsPerMinute = httpContext.RequestServices.GetRequiredService<IConfiguration>()
            .GetValue("RateLimiting:AuthPermitsPerMinute", 30);
        var key = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permitsPerMinute,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
    });
});

// 7. Swagger với JWT
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "SmartMeal API",
        Version = "v1",
        Description = "Backend RESTful API for SmartMeal Mobile Application (PRM393 - FPT University)"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập JWT Bearer token vào ô bên dưới. Ví dụ: 'Bearer eyJhbGci...'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

if (string.IsNullOrWhiteSpace(app.Configuration.GetConnectionString("DefaultConnection")))
{
    throw new InvalidOperationException(
        "Thiếu ConnectionStrings:DefaultConnection — đặt biến môi trường ConnectionStrings__DefaultConnection (hoặc file .env, xem .env.example).");
}

app.UseExceptionHandler();

// Phản hồi không có body (404 sai đường dẫn, 405, 415...) cũng trả envelope thay vì rỗng.
app.UseStatusCodePages(async context =>
{
    var response = context.HttpContext.Response;
    if (response.ContentLength is > 0 || !string.IsNullOrEmpty(response.ContentType))
    {
        return;
    }

    await ApiErrorWriter.WriteAsync(context.HttpContext, response.StatusCode, ApiErrorWriter.DefaultMessage(response.StatusCode));
});

// Swagger chỉ bật ở Development, hoặc khi chủ động đặt Swagger:Enabled=true (vd. môi trường demo).
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "SmartMeal API v1");
        c.RoutePrefix = "swagger";
    });
}

// Phục vụ file người dùng tải lên. File có tên ngẫu nhiên nên cache lâu được; nosniff chặn trình duyệt đoán loại file.
var uploadsRoot = LocalFileStorage.ResolveRoot(
    app.Services.GetRequiredService<IOptions<StorageOptions>>().Value, app.Environment);
Directory.CreateDirectory(uploadsRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsRoot),
    RequestPath = "/uploads",
    OnPrepareResponse = context =>
    {
        context.Context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Context.Response.Headers["Cache-Control"] = "public,max-age=31536000,immutable";
    }
});

app.UseCors("Default");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Tự áp migration + seed khi khởi động. Development vẫn chạy được khi chưa bật database (để xem Swagger);
// môi trường khác dừng ngay để không phục vụ trên schema cũ.
await using (var scope = app.Services.CreateAsyncScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();
        // Tài khoản dùng thử (smartmealuser@gmail.com) có mật khẩu đã biết nên CHỈ được tạo ở môi trường Development.
        await DbInitializer.SeedAsync(
            db,
            seedDevAccount: app.Environment.IsDevelopment(),
            devAccountPassword: app.Configuration["Seed:DevAccountPassword"]);
        logger.LogInformation("[Database] Migration and seed applied successfully.");
    }
    catch (Exception ex) when (app.Environment.IsDevelopment())
    {
        logger.LogError(ex, "[Database] Migration failed — API keeps running without a usable database.");
    }
}

app.Run();

// Cho phép test tích hợp (WebApplicationFactory<Program>) truy cập entry point.
public partial class Program;
