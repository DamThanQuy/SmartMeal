/**
 * badgeService.api: mặc / tháo trang phục Bé Mầm lưu trên server, luôn gửi `?date=` theo giờ máy.
 */
const TODAY = '2026-10-14';

function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
  }));
  jest.doMock('@/features/nutrition', () => ({ todayIso: () => TODAY }));

  const module =
    require('@/features/gamification/services/badgeService.api') as typeof import('@/features/gamification/services/badgeService.api');

  return { service: module.badgeApiService, apiMock };
}

describe('badgeService.api — trang phục', () => {
  test('mặc: POST /gamification/costumes/{id}/equip', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({});

    await service.equipCostume!('straw-hat');

    expect(apiMock.post).toHaveBeenCalledWith('/gamification/costumes/straw-hat/equip', undefined, {
      params: { date: TODAY },
    });
  });

  test('tháo: DELETE /gamification/costumes/equipped', async () => {
    const { service, apiMock } = loadService();
    apiMock.delete.mockResolvedValue({});

    await service.unequipCostume!();

    expect(apiMock.delete).toHaveBeenCalledWith('/gamification/costumes/equipped', { params: { date: TODAY } });
  });
});
