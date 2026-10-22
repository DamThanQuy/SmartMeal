/**
 * haptics: mỗi loại phản hồi gọi đúng API của expo-haptics, web bỏ qua, lỗi thiết bị không làm hỏng UI.
 */
import type { HapticFeedbackType } from '@/utils/haptics';

function loadHaptics(os: 'ios' | 'android' | 'web' = 'android') {
  const hapticsMock = {
    impactAsync: jest.fn().mockResolvedValue(undefined),
    selectionAsync: jest.fn().mockResolvedValue(undefined),
    notificationAsync: jest.fn().mockResolvedValue(undefined),
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
    NotificationFeedbackType: {
      Success: 'success',
      Warning: 'warning',
      Error: 'error',
    },
  };

  jest.resetModules();
  jest.doMock('expo-haptics', () => hapticsMock);
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));

  const module = require('@/utils/haptics') as typeof import('@/utils/haptics');
  return { ...module, hapticsMock };
}

describe('triggerHaptic', () => {
  test.each([
    ['light', 'impactAsync', 'light'],
    ['medium', 'impactAsync', 'medium'],
    ['heavy', 'impactAsync', 'heavy'],
    ['success', 'notificationAsync', 'success'],
    ['warning', 'notificationAsync', 'warning'],
    ['error', 'notificationAsync', 'error'],
  ] as const)('%s → %s(%s)', async (type, method, arg) => {
    const { triggerHaptic, hapticsMock } = loadHaptics();

    await triggerHaptic(type);

    expect(hapticsMock[method]).toHaveBeenCalledWith(arg);
  });

  test('selection và loại không xác định → selectionAsync', async () => {
    const { triggerHaptic, hapticsMock } = loadHaptics('ios');

    await triggerHaptic('selection');
    await triggerHaptic('unknown' as HapticFeedbackType);

    expect(hapticsMock.selectionAsync).toHaveBeenCalledTimes(2);
  });

  test('mặc định là light', async () => {
    const { triggerHaptic, hapticsMock } = loadHaptics();

    await triggerHaptic();

    expect(hapticsMock.impactAsync).toHaveBeenCalledWith('light');
  });

  test('web → không gọi expo-haptics', async () => {
    const { triggerHaptic, hapticsMock } = loadHaptics('web');

    await triggerHaptic('success');

    expect(hapticsMock.notificationAsync).not.toHaveBeenCalled();
    expect(hapticsMock.impactAsync).not.toHaveBeenCalled();
  });

  test('thiết bị không hỗ trợ (API ném lỗi) → nuốt lỗi, không ném ra UI', async () => {
    const { triggerHaptic, hapticsMock } = loadHaptics();
    hapticsMock.impactAsync.mockRejectedValue(new Error('not supported'));

    await expect(triggerHaptic('heavy')).resolves.toBeUndefined();
  });

  test('haptic.* là lối tắt cho từng loại', async () => {
    const { haptic, hapticsMock } = loadHaptics();

    await haptic.success();
    await haptic.selection();
    await haptic.medium();

    expect(hapticsMock.notificationAsync).toHaveBeenCalledWith('success');
    expect(hapticsMock.selectionAsync).toHaveBeenCalledTimes(1);
    expect(hapticsMock.impactAsync).toHaveBeenCalledWith('medium');
  });
});
