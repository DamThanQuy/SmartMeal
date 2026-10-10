function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn() };

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
  }));

  const module =
    require('@/features/scanner/services/scannerService.api') as typeof import('@/features/scanner/services/scannerService.api');

  return { service: module.scannerApiService, apiMock };
}

describe('scannerService.api', () => {
  test('scanFridge gửi multipart form-data tới /ai/fridge-scanner và map nguyên liệu nhận diện', async () => {
    const { service, apiMock } = loadService();

    apiMock.post.mockResolvedValue({
      detectedIngredients: ['Cà chua bi', 'Bơ', 'Trứng gà'],
      suggestedRecipes: [
        {
          title: 'Salad Bơ Trứng',
          description: 'Món salad bổ dưỡng',
          calories: 250,
          cookingTimeMinutes: 10,
          matchingIngredients: ['Cà chua bi', 'Bơ', 'Trứng gà'],
          missingIngredients: [],
          quickInstructions: 'Trộn đều',
        },
      ],
    });

    const result = await service.scanFridge?.('file:///custom_fridge.jpg');

    expect(apiMock.post).toHaveBeenCalledTimes(1);
    const [url, form] = apiMock.post.mock.calls[0] as [string, FormData];
    expect(url).toBe('/ai/fridge-scanner');
    expect(form).toBeInstanceOf(FormData);
    expect(result).toHaveLength(3);
    expect(result?.[0]).toMatchObject({
      name: 'Cà chua bi',
      quantityLabel: '1 phần',
      status: 'confirmed',
    });
    expect(result?.[1]).toMatchObject({
      name: 'Bơ',
      status: 'confirmed',
    });
  });

  test('scanFridge trả về rỗng nếu không nhận diện được nguyên liệu', async () => {
    const { service, apiMock } = loadService();

    apiMock.post.mockResolvedValue({
      detectedIngredients: [],
      suggestedRecipes: [],
    });

    const result = await service.scanFridge?.();
    expect(result).toEqual([]);
  });
});
