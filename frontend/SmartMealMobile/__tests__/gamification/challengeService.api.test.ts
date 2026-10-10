import type { ChallengeApiDto } from '@/features/gamification/types/challenge.api.types';

function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn() };

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
  }));

  const module =
    require('@/features/gamification/services/challengeService.api') as typeof import('@/features/gamification/services/challengeService.api');

  return { service: module.challengeApiService, apiMock };
}

describe('challengeService.api', () => {
  const MOCK_CHALLENGES: ChallengeApiDto[] = [
    {
      id: 'c-1',
      title: '7 Ngày Uống Đủ 2L Nước',
      description: 'Uống đủ nước mỗi ngày',
      imageUrl: 'https://img.com/water.jpg',
      durationDays: 7,
      completedDays: 0,
      rewardExp: 150,
      rewardBadge: 'Hydration Master',
      isJoined: false,
      isCompleted: false,
    },
    {
      id: 'c-2',
      title: 'Eat Clean 14 Ngày',
      description: 'Ăn lành mạnh',
      imageUrl: 'https://img.com/clean.jpg',
      durationDays: 14,
      completedDays: 5,
      rewardExp: 300,
      rewardBadge: 'Clean Eater Pro',
      isJoined: true,
      isCompleted: false,
    },
  ];

  test('getChallenges gọi GET /gamification/challenges và map đầy đủ trường', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue(MOCK_CHALLENGES);

    const result = await service.getChallenges?.();

    expect(apiMock.get).toHaveBeenCalledWith('/gamification/challenges');
    expect(result).toHaveLength(2);
    expect(result?.[0]).toMatchObject({
      id: 'c-1',
      title: '7 Ngày Uống Đủ 2L Nước',
      xpReward: 150,
      joined: false,
      completed: false,
      dayTotal: 7,
      dayCurrent: 1,
    });
    expect(result?.[1]).toMatchObject({
      id: 'c-2',
      title: 'Eat Clean 14 Ngày',
      joined: true,
      completed: false,
      dayTotal: 14,
      dayCurrent: 5,
    });
  });

  test('joinChallenge gọi POST /gamification/challenges/:id/join', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({ id: 'c-1', isJoined: true });

    await service.joinChallenge?.('c-1');

    expect(apiMock.post).toHaveBeenCalledWith('/gamification/challenges/c-1/join');
  });
});
