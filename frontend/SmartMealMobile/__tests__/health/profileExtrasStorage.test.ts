/**
 * profileExtrasStorage (docs/fetch-api/part1 §6.5): phần hồ sơ BE không lưu (chế độ ăn, dị ứng/
 * bệnh lý không có id) được giữ ở AsyncStorage theo từng user và không được làm hỏng luồng chính.
 */
import type { HealthProfileExtras } from '@/features/health/types/health.types';

interface StorageMock {
  getString: jest.Mock;
  setString: jest.Mock;
  delete: jest.Mock;
}

function loadModule() {
  const storage: StorageMock = {
    getString: jest.fn(),
    setString: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  jest.resetModules();
  jest.doMock('@/services/storage/storage', () => ({ storageService: storage }));

  const module =
    require('@/features/health/services/profileExtrasStorage') as typeof import('@/features/health/services/profileExtrasStorage');
  return { ...module, storage };
}

const EXTRAS: HealthProfileExtras = {
  dietaryPreferenceIds: ['keto', 'lowCarb'],
  localAllergyIds: ['treeNut'],
  localHealthConditionIds: ['other'],
};

describe('profileExtrasStorage', () => {
  test('save ghi JSON vào khóa theo từng user', async () => {
    const { profileExtrasStorage, storage } = loadModule();

    await profileExtrasStorage.save('user-1', EXTRAS);

    expect(storage.setString).toHaveBeenCalledWith(
      'user.profileExtras.user-1',
      JSON.stringify(EXTRAS),
    );
  });

  test('load đọc lại đúng dữ liệu đã lưu của đúng user', async () => {
    const { profileExtrasStorage, storage } = loadModule();
    storage.getString.mockResolvedValue(JSON.stringify(EXTRAS));

    expect(await profileExtrasStorage.load('user-2')).toEqual(EXTRAS);
    expect(storage.getString).toHaveBeenCalledWith('user.profileExtras.user-2');
  });

  test('chưa lưu gì → rỗng', async () => {
    const { profileExtrasStorage, storage, EMPTY_PROFILE_EXTRAS } = loadModule();
    storage.getString.mockResolvedValue(undefined);

    expect(await profileExtrasStorage.load('user-1')).toEqual(EMPTY_PROFILE_EXTRAS);
  });

  test('dữ liệu hỏng → rỗng, không ném lỗi', async () => {
    const { profileExtrasStorage, storage, EMPTY_PROFILE_EXTRAS } = loadModule();

    storage.getString.mockResolvedValue('{không phải json');
    expect(await profileExtrasStorage.load('user-1')).toEqual(EMPTY_PROFILE_EXTRAS);

    storage.getString.mockResolvedValue('123');
    expect(await profileExtrasStorage.load('user-1')).toEqual(EMPTY_PROFILE_EXTRAS);

    storage.getString.mockResolvedValue('null');
    expect(await profileExtrasStorage.load('user-1')).toEqual(EMPTY_PROFILE_EXTRAS);
  });

  test('thiếu field hoặc phần tử sai kiểu → chỉ giữ chuỗi hợp lệ', () => {
    const { parseProfileExtras } = loadModule();

    expect(
      parseProfileExtras(JSON.stringify({ dietaryPreferenceIds: ['keto', 5, null], localAllergyIds: 'x' })),
    ).toEqual({
      dietaryPreferenceIds: ['keto'],
      localAllergyIds: [],
      localHealthConditionIds: [],
    });
  });

  test('storage lỗi khi đọc → rỗng; lỗi khi ghi → không ném (chỉ cảnh báo)', async () => {
    const { profileExtrasStorage, storage, EMPTY_PROFILE_EXTRAS } = loadModule();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    storage.getString.mockRejectedValue(new Error('disk'));
    storage.setString.mockRejectedValue(new Error('disk full'));

    expect(await profileExtrasStorage.load('user-1')).toEqual(EMPTY_PROFILE_EXTRAS);
    await expect(profileExtrasStorage.save('user-1', EXTRAS)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  test('clear xóa khóa của user và không ném khi storage lỗi', async () => {
    const { profileExtrasStorage, storage } = loadModule();

    await profileExtrasStorage.clear('user-1');
    expect(storage.delete).toHaveBeenCalledWith('user.profileExtras.user-1');

    storage.delete.mockRejectedValue(new Error('disk'));
    await expect(profileExtrasStorage.clear('user-1')).resolves.toBeUndefined();
  });
});
