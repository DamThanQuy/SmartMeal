using System.Net;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>
/// Chia sẻ bộ sưu tập bằng liên kết (báo cáo gap §6, BR-152): chỉ chủ sở hữu bật/tắt/tạo lại mã; ai có mã đều xem được (chỉ đọc,
/// kể cả bộ sưu tập riêng tư, không cần đăng nhập); mã đã tắt hoặc đã thay không mở được nữa.
/// </summary>
public class CollectionShareTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public CollectionShareTests(ApiFactory factory) => _factory = factory;

    private static async Task<CollectionPayload> CreateCollectionWithRecipeAsync(HttpClient client, bool isPublic = false)
    {
        var created = await client.PostJsonAsync("/api/recipes/collections", new { name = "Món tuần này", isPublic });
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        var collection = (await created.ReadEnvelopeAsync<CollectionPayload>()).Data!;

        var recipes = (await (await client.GetAsync("/api/recipes")).ReadEnvelopeAsync<List<RecipePayload>>()).Data!;
        var added = await client.PostJsonAsync($"/api/recipes/collections/{collection.Id}/items", new { recipeId = recipes[0].Id });
        Assert.Equal(HttpStatusCode.OK, added.StatusCode);
        return collection;
    }

    private static async Task<CollectionSharePayload> ShareAsync(HttpClient client, Guid collectionId, bool regenerate = false)
    {
        var response = await client.PostAsync($"/api/recipes/collections/{collectionId}/share{(regenerate ? "?regenerate=true" : "")}", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<CollectionSharePayload>()).Data!;
    }

    [DbFact]
    public async Task Anyone_with_the_link_can_view_a_private_collection_read_only()
    {
        var owner = await _factory.RegisterUserAsync();
        var collection = await CreateCollectionWithRecipeAsync(owner.Client);

        var share = await ShareAsync(owner.Client, collection.Id);
        Assert.Matches("^[A-Za-z0-9_-]{32}$", share.ShareToken);

        // Chủ sở hữu thấy mã đang bật trong chi tiết bộ sưu tập.
        var mine = (await (await owner.Client.GetAsync($"/api/recipes/collections/{collection.Id}")).ReadEnvelopeAsync<CollectionPayload>()).Data!;
        Assert.Equal(share.ShareToken, mine.ShareToken);

        // Người lạ (không đăng nhập) mở được qua mã nhưng không thấy mã và không phải chủ.
        var anonymous = await _factory.CreateClient().GetAsync($"/api/recipes/collections/shared/{share.ShareToken}");
        Assert.Equal(HttpStatusCode.OK, anonymous.StatusCode);
        var viewed = (await anonymous.ReadEnvelopeAsync<CollectionPayload>()).Data!;
        Assert.Equal(collection.Id, viewed.Id);
        Assert.False(viewed.IsOwner);
        Assert.Null(viewed.ShareToken);
        Assert.Single(viewed.Recipes);

        // Người dùng khác vẫn không xem được bằng id khi bộ sưu tập riêng tư.
        var other = await _factory.RegisterUserAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await other.Client.GetAsync($"/api/recipes/collections/{collection.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await other.Client.GetAsync($"/api/recipes/collections/shared/{share.ShareToken}")).StatusCode);
    }

    [DbFact]
    public async Task Sharing_again_keeps_the_link_regenerating_replaces_it_and_revoking_closes_it()
    {
        var owner = await _factory.RegisterUserAsync();
        var collection = await CreateCollectionWithRecipeAsync(owner.Client);
        var anonymous = _factory.CreateClient();

        var first = await ShareAsync(owner.Client, collection.Id);
        Assert.Equal(first.ShareToken, (await ShareAsync(owner.Client, collection.Id)).ShareToken);

        var regenerated = await ShareAsync(owner.Client, collection.Id, regenerate: true);
        Assert.NotEqual(first.ShareToken, regenerated.ShareToken);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/recipes/collections/shared/{first.ShareToken}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await anonymous.GetAsync($"/api/recipes/collections/shared/{regenerated.ShareToken}")).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await owner.Client.DeleteAsync($"/api/recipes/collections/{collection.Id}/share")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.Client.DeleteAsync($"/api/recipes/collections/{collection.Id}/share")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/recipes/collections/shared/{regenerated.ShareToken}")).StatusCode);
        Assert.Null((await (await owner.Client.GetAsync($"/api/recipes/collections/{collection.Id}")).ReadEnvelopeAsync<CollectionPayload>()).Data!.ShareToken);
    }

    [DbFact]
    public async Task Only_the_owner_can_share_and_unknown_links_are_not_found()
    {
        var owner = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();
        var privateOne = await CreateCollectionWithRecipeAsync(owner.Client);
        var publicOne = await CreateCollectionWithRecipeAsync(owner.Client, isPublic: true);

        Assert.Equal(HttpStatusCode.NotFound, (await other.Client.PostAsync($"/api/recipes/collections/{privateOne.Id}/share", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.Client.PostAsync($"/api/recipes/collections/{publicOne.Id}/share", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.Client.DeleteAsync($"/api/recipes/collections/{publicOne.Id}/share")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().PostAsync($"/api/recipes/collections/{privateOne.Id}/share", null)).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await other.Client.GetAsync("/api/recipes/collections/shared/khong-ton-tai")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.Client.GetAsync($"/api/recipes/collections/shared/{new string('a', 65)}")).StatusCode);
    }
}
