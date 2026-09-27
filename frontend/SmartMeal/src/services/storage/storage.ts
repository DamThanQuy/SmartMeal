import { createMMKV } from 'react-native-mmkv';

// MMKV — preference, theme, language, onboarding, cache không nhạy cảm.
// Access/refresh token KHÔNG được lưu ở đây — dùng src/services/storage/secureStorage.ts (Keychain).
export const storage = createMMKV({ id: 'smartmeal.storage' });

export const storageService = {
  getString(key: string): string | undefined {
    return storage.getString(key);
  },
  setString(key: string, value: string): void {
    storage.set(key, value);
  },
  getBoolean(key: string): boolean | undefined {
    return storage.getBoolean(key);
  },
  setBoolean(key: string, value: boolean): void {
    storage.set(key, value);
  },
  delete(key: string): void {
    storage.remove(key);
  },
};
