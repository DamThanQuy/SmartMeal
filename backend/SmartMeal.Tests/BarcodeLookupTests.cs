using System.Collections.Concurrent;
using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Services;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>BR-120: mã vạch chưa có trong CSDL thì tra Open Food Facts rồi lưu thành thực phẩm chung "chưa kiểm chứng".</summary>
public class BarcodeLookupTests
{
    private const string Barcode = "8934841901234";

    private const string SoyMilkJson = """
        {
          "status": 1,
          "product": {
            "product_name": "Sữa đậu nành Fami",
            "brands": "Vinasoy, Fami",
            "image_front_small_url": "https://images.openfoodfacts.org/fami.jpg",
            "serving_quantity": "200",
            "serving_quantity_unit": "ml",
            "nutriments": {
              "energy-kcal_100g": 60,
              "proteins_100g": 2.6,
              "carbohydrates_100g": "6.8",
              "sugars_100g": 5.5,
              "fat_100g": 2.2,
              "sodium_100g": 0.05
            },
            "allergens_tags": ["en:soybeans"],
            "traces_tags": ["en:milk"]
          }
        }
        """;

    /// <summary>Thay Open Food Facts thật: trả một phản hồi cố định và đếm số lần bị gọi.</summary>
    private sealed class StubOpenFoodFactsHandler : HttpMessageHandler
    {
        private readonly ConcurrentQueue<Uri> _calls = new();

        public HttpStatusCode Status { get; init; } = HttpStatusCode.OK;
        public string Body { get; init; } = "{}";
        public IReadOnlyList<Uri> Calls => _calls.ToArray();

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            _calls.Enqueue(request.RequestUri!);
            return Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(Body, Encoding.UTF8, "application/json") });
        }
    }

    private static ApiFactory Factory(StubOpenFoodFactsHandler stub) =>
        new ApiFactory()
            .WithSetting("OpenFoodFacts:Enabled", "true")
            .WithServices(services =>
                services.AddHttpClient<IProductCatalogLookup, OpenFoodFactsLookup>().ConfigurePrimaryHttpMessageHandler(() => stub));

    [DbFact]
    public async Task An_unknown_barcode_is_imported_once_from_open_food_facts_as_an_unverified_shared_food()
    {
        var stub = new StubOpenFoodFactsHandler { Body = SoyMilkJson };
        using var factory = Factory(stub);
        var user = await factory.RegisterUserAsync();

        var response = await user.Client.GetAsync($"/api/foods/barcode/{Barcode}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var food = (await response.ReadEnvelopeAsync<FoodPayload>()).Data!;
        Assert.Equal("Sữa đậu nành Fami", food.Name);
        Assert.Equal(Barcode, food.Barcode);
        Assert.False(food.IsVerified);
        Assert.False(food.IsUserCreated);
        Assert.Contains("Open Food Facts", food.Description);
        Assert.Equal(60, food.CaloriesPer100g);
        Assert.Equal(6.8, food.CarbsPer100g);
        Assert.Equal(50, food.SodiumMgPer100g);
        Assert.Equal(new[] { 3, 6 }, food.AllergyIds); // sữa (vết) + đậu nành
        Assert.Equal(2, food.Servings.Count);
        Assert.Equal("1 phần (200 g)", food.Servings.Single(s => s.Id == food.DefaultServingId).Label);
        Assert.Contains($"/api/v2/product/{Barcode}.json", stub.Calls.Single().ToString());

        // Lần sau (kể cả người khác) đọc từ CSDL, không gọi ra ngoài nữa.
        var other = await factory.RegisterUserAsync();
        Assert.Equal(food.Id, (await (await other.Client.GetAsync($"/api/foods/barcode/{Barcode}")).ReadEnvelopeAsync<FoodPayload>()).Data!.Id);
        Assert.Single(stub.Calls);
    }

    [DbFact]
    public async Task Scanning_an_imported_product_warns_about_the_users_allergy()
    {
        using var factory = Factory(new StubOpenFoodFactsHandler { Body = SoyMilkJson });
        var user = await factory.RegisterUserAsync();
        (await user.Client.PostJsonAsync("/api/healthprofile/survey", new
        {
            gender = "Female", age = 25, heightCm = 160, currentWeightKg = 50, targetWeightKg = 50,
            activityLevel = "Light", goal = "Maintain", allergyIds = new[] { 6 }
        })).EnsureSuccessStatusCode();

        var response = await user.Client.PostJsonAsync("/api/ai/check-safety", new { barcode = Barcode });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var text = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(text);
        var data = json.RootElement.GetProperty("data");
        Assert.False(data.GetProperty("isSafe").GetBoolean());
        Assert.Contains(data.GetProperty("alerts").EnumerateArray(), a => a.GetProperty("type").GetString() == "ALLERGY");
        Assert.Contains(data.GetProperty("alerts").EnumerateArray(), a => a.GetProperty("type").GetString() == "UNVERIFIED");
    }

    [DbFact]
    public async Task A_barcode_open_food_facts_does_not_know_is_still_a_404()
    {
        var stub = new StubOpenFoodFactsHandler { Status = HttpStatusCode.NotFound, Body = """{"status":0}""" };
        using var factory = Factory(stub);
        var user = await factory.RegisterUserAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.GetAsync($"/api/foods/barcode/{Barcode}")).StatusCode);
        Assert.Single(stub.Calls);
    }

    [Fact]
    public void Parsing_rejects_products_without_usable_data_and_converts_units()
    {
        static ExternalProduct? Parse(string json) => OpenFoodFactsLookup.Parse(Barcode, JsonDocument.Parse(json).RootElement);

        // Năng lượng chỉ có kJ → đổi ra kcal; natri suy từ muối.
        var kj = Parse("""{"status":1,"product":{"product_name":"Bánh quy","nutriments":{"energy_100g":2092,"salt_100g":1}}}""")!;
        Assert.Equal(500, kj.CaloriesPer100g);
        Assert.Equal(400, kj.SodiumMgPer100g);
        Assert.Null(kj.ServingGrams);
        Assert.Empty(kj.AllergenCodes);

        Assert.Null(Parse("""{"status":1,"product":{"nutriments":{"energy-kcal_100g":100}}}"""));                  // không có tên
        Assert.Null(Parse("""{"status":1,"product":{"product_name":"Nước"}}"""));                                    // không có năng lượng
        Assert.Null(Parse("""{"status":1,"product":{"product_name":"Lỗi","nutriments":{"energy-kcal_100g":100,"fat_100g":150}}}"""));
        Assert.Null(Parse("""{"status":0}"""));
    }
}
