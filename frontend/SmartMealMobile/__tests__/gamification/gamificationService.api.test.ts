jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn() };

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
  }));
  jest.doMock('@/features/nutrition/services/nutritionService', () => ({
    nutritionService: { getDiaryDay: jest.fn().mockResolvedValue(null) },
  }));
  jest.doMock('@/features/gamification/services/waterService', () => ({
    waterService: { getDaySummary: jest.fn().mockResolvedValue(null) },
    CUP_ML: 250,
  }));
  jest.doMock('@/features/gamification/services/challengeService', () => ({
    challengeService: { getChallenges: jest.fn().mockResolvedValue([]) },
  }));

  const module =
    require('@/features/gamification/services/gamificationService.api') as typeof import('@/features/gamification/services/gamificationService.api');

  return { service: module.gamificationApiService, apiMock };
}

describe('gamificationService.api', () => {
  test('getPetState gọi song song BE pet và streak', async () => {
    const { service, apiMock } = loadService();

    apiMock.get.mockImplementation((endpoint: string) => {
      if (endpoint === '/gamification/pet') {
        return Promise.resolve({
          petName: 'Dino Healthy',
          petType: 'Dino',
          level: 2,
          exp: 40,
          nextLevelExp: 200,
          stage: 'Baby',
          mood: 'Happy',
          statusMessage: 'Dino vui vẻ!',
          currentOutfit: 'Default',
          nutritionScoreToday: 85,
        });
      }
      if (endpoint === '/gamification/streak') {
        return Promise.resolve({
          currentStreak: 3,
          longestStreak: 5,
          totalActiveDays: 3,
          hasLoggedToday: true,
          recentActivity: [
            { date: '2026-10-04', dayOfWeek: 'Sat', hasLogged: true },
            { date: '2026-10-05', dayOfWeek: 'Sun', hasLogged: true },
            { date: '2026-10-06', dayOfWeek: 'Mon', hasLogged: true },
            { date: '2026-10-07', dayOfWeek: 'Tue', hasLogged: false },
            { date: '2026-10-08', dayOfWeek: 'Wed', hasLogged: false },
            { date: '2026-10-09', dayOfWeek: 'Thu', hasLogged: false },
            { date: '2026-10-10', dayOfWeek: 'Fri', hasLogged: true },
          ],
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const result = await service.getPetState?.();

    expect(apiMock.get).toHaveBeenCalledWith('/gamification/pet');
    expect(apiMock.get).toHaveBeenCalledWith('/gamification/streak');
    expect(result).toMatchObject({
      name: 'Dino Healthy',
      level: 2,
      xpIntoLevel: 40,
      xpPerLevel: 200,
      streakDays: 3,
      message: 'Dino vui vẻ!',
    });
    expect(result?.tasks).toHaveLength(3);
    expect(result?.weekCompletion).toEqual([true, true, true, false, false, false, true]);
  });
});
