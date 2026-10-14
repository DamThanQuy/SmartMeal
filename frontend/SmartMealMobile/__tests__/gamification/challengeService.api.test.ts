/**
 * challengeService.api: khung ngày lấy từ server (startDate/endDate/currentDay/isExpired), luôn gửi
 * `?date=` theo giờ máy, không có "hoàn thành" phía client (review PR #9 G3/G4).
 */
import type { ChallengeApiDto } from '@/features/gamification/types/challenge.api.types';

const TODAY = '2026-10-14';

function dto(overrides: Partial<ChallengeApiDto>): ChallengeApiDto {
  return {
    id: 'c1',
    title: '7 Ngày Uống Đủ 2L Nước',
    description: 'Uống đủ nước mỗi ngày',
    imageUrl: null,
    durationDays: 7,
    completedDays: 0,
    rewardExp: 150,
    rewardBadge: 'Hydration Master',
    isJoined: false,
    isCompleted: false,
    category: 'DrinkWater',
    targetValuePerDay: 2000,
    startDate: null,
    endDate: null,
    currentDay: 0,
    isExpired: false,
    ...overrides,
  };
}

function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn() };

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
  }));
  jest.doMock('@/features/nutrition', () => ({ todayIso: () => TODAY }));

  const module =
    require('@/features/gamification/services/challengeService.api') as typeof import('@/features/gamification/services/challengeService.api');

  return { service: module.challengeApiService, apiMock };
}

describe('challengeService.api', () => {
  test('khung ngày của người tham gia lấy từ server; chưa tham gia = khung nếu tham gia hôm nay', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue([
      dto({ id: 'joined', isJoined: true, startDate: '2026-10-11', endDate: '2026-10-17', currentDay: 4, completedDays: 2 }),
      dto({ id: 'open' }),
      dto({ id: 'expired', isJoined: true, isExpired: true, startDate: '2026-09-01', endDate: '2026-09-07', currentDay: 7, completedDays: 3 }),
      dto({ id: 'done', isJoined: true, isCompleted: true, rewardBadge: 'eat-clean-7' }),
    ]);

    const [joined, open, expired, done] = await service.getChallenges!();

    expect(apiMock.get).toHaveBeenCalledWith('/gamification/challenges', { params: { date: TODAY } });
    expect(joined).toMatchObject({ joined: true, startIso: '2026-10-11', endIso: '2026-10-17', dayCurrent: 4, completedDays: 2 });
    expect(open).toMatchObject({ joined: false, startIso: TODAY, endIso: '2026-10-20', dayCurrent: 1, completedDays: 0 });
    // Hết khung mà chưa xong → hiện như có thể tham gia lại (khung mới bắt đầu hôm nay).
    expect(expired).toMatchObject({ joined: false, startIso: TODAY, completedDays: 0 });
    expect(done).toMatchObject({ completed: true, badgeId: 'eat-clean-7', rewardLabel: undefined, completedDays: 7 });
    expect(joined.rewardLabel).toBe('Hydration Master');
  });

  test('tham gia gửi ngày theo giờ máy', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue(dto({ isJoined: true }));

    await service.joinChallenge!('c1');

    expect(apiMock.post).toHaveBeenCalledWith('/gamification/challenges/c1/join', undefined, { params: { date: TODAY } });
  });

  test('không còn hàm hoàn thành thử thách phía client', () => {
    const { service } = loadService();

    expect('completeChallenge' in service).toBe(false);
  });
});
