/**
 * gamificationService.api: nhiệm vụ, cấp và XP lấy từ server (không tự tính lại), `?date=` theo giờ
 * máy, chuỗi ngày đặt theo NGÀY vào ô Thứ 2 → CN (review PR #9 G1/G2).
 */
import type { HealthPetStatusDto, StreakStatusDto } from '@/features/gamification/types/gamification.api.types';

// Thứ Tư 14/10/2026.
const TODAY = '2026-10-14';

const PET: HealthPetStatusDto = {
  petName: 'Bé Mầm',
  petType: 'Sprout',
  level: 3,
  exp: 120,
  nextLevelExp: 500,
  totalXp: 1120,
  xpIntoLevel: 120,
  xpPerLevel: 500,
  stage: 'Child',
  mood: 'Happy',
  statusMessage: 'Hôm nay bạn làm tốt lắm!',
  currentOutfit: 'Default',
  nutritionScoreToday: 80,
  tasks: [
    { id: 'breakfast', label: 'Ghi bữa sáng', xpReward: 10, progressCurrent: 1, progressTarget: 1, unit: 'bữa', completed: true },
    { id: 'protein', label: 'Đạt mục tiêu protein', xpReward: 20, progressCurrent: 42.6, progressTarget: 90, unit: 'g', completed: false },
    { id: 'water', label: 'Uống đủ nước', xpReward: 10, progressCurrent: 750, progressTarget: 2000, unit: 'ml', completed: false },
  ],
};

// 7 ngày kết thúc hôm nay (Thứ Năm 08/10 → Thứ Tư 14/10).
const STREAK: StreakStatusDto = {
  currentStreak: 3,
  longestStreak: 5,
  totalActiveDays: 6,
  hasLoggedToday: true,
  recentActivity: [
    { date: '2026-10-08', dayOfWeek: 'Thu', hasLogged: true },
    { date: '2026-10-09', dayOfWeek: 'Fri', hasLogged: true },
    { date: '2026-10-10', dayOfWeek: 'Sat', hasLogged: false },
    { date: '2026-10-11', dayOfWeek: 'Sun', hasLogged: true },
    { date: '2026-10-12', dayOfWeek: 'Mon', hasLogged: true },
    { date: '2026-10-13', dayOfWeek: 'Tue', hasLogged: false },
    { date: '2026-10-14', dayOfWeek: 'Wed', hasLogged: true },
  ],
};

function loadService(challenges: unknown[] = []) {
  const apiMock = { get: jest.fn() };
  const challengeMock = { getChallenges: jest.fn().mockResolvedValue(challenges) };

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
  }));
  jest.doMock('@/features/nutrition', () => ({ todayIso: () => TODAY }));
  jest.doMock('@/features/gamification/services/challengeService', () => ({ challengeService: challengeMock }));

  apiMock.get.mockImplementation((url: string) => Promise.resolve(url.endsWith('/pet') ? PET : STREAK));

  const module =
    require('@/features/gamification/services/gamificationService.api') as typeof import('@/features/gamification/services/gamificationService.api');

  return { service: module.gamificationApiService, apiMock, challengeMock };
}

describe('gamificationService.api', () => {
  test('dùng nhiệm vụ, cấp và XP của server; gửi ngày theo giờ máy', async () => {
    const { service, apiMock } = loadService();

    const pet = await service.getPetState!();

    expect(apiMock.get).toHaveBeenCalledWith('/gamification/pet', { params: { date: TODAY } });
    expect(apiMock.get).toHaveBeenCalledWith('/gamification/streak', { params: { date: TODAY } });
    expect(pet).toMatchObject({ name: 'Bé Mầm', level: 3, xpIntoLevel: 120, xpPerLevel: 500, streakDays: 3 });
    expect(pet.tasks.map(task => [task.id, task.progressLabel, task.completed])).toEqual([
      ['breakfast', 'Xong', true],
      ['protein', '43/90 g', false],
      ['water', '750/2000 ml', false],
    ]);
    expect(pet.challenge).toBeNull();
  });

  test('chuỗi ngày đặt theo ngày vào Thứ 2 → CN của tuần này, không theo vị trí trong mảng', async () => {
    const { service } = loadService();

    const { weekCompletion } = await service.getPetState!();

    // T2 12/10 ✓, T3 13/10 ✗, T4 14/10 ✓, T5–CN chưa tới.
    expect(weekCompletion).toEqual([true, false, true, false, false, false, false]);
  });

  test('thẻ thử thách là thử thách đang tham gia; tải thử thách lỗi vẫn hiện pet', async () => {
    const joined = { id: 'c', title: 'Eat Clean', joined: true, completed: false, dayCurrent: 2, dayTotal: 14, xpReward: 300 };
    const { service } = loadService([joined]);
    expect((await service.getPetState!()).challenge).toEqual({ title: 'Eat Clean', dayCurrent: 2, dayTotal: 14, xpReward: 300 });

    const failing = loadService();
    failing.challengeMock.getChallenges.mockRejectedValue(new Error('Mất mạng'));
    expect((await failing.service.getPetState!()).challenge).toBeNull();
  });
});
