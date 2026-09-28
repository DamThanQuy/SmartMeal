import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage — preference, theme, language, onboarding, cache không nhạy cảm.
// Access/refresh token KHÔNG được lưu ở đây — dùng src/services/storage/secureStorage.ts
// (expo-secure-store) khi cần.
// API bất đồng bộ (khác MMKV) — nơi gọi (ThemeProvider, appStore...) phải await/hydrate đúng cách,
// không giả định có giá trị ngay ở lần render đầu tiên.
export const storageService = {
  async getString(key: string): Promise<string | undefined> {
    const value = await AsyncStorage.getItem(key);
    return value ?? undefined;
  },
  async setString(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },
  async getBoolean(key: string): Promise<boolean | undefined> {
    const value = await AsyncStorage.getItem(key);
    return value === null ? undefined : value === 'true';
  },
  async setBoolean(key: string, value: boolean): Promise<void> {
    await AsyncStorage.setItem(key, value ? 'true' : 'false');
  },
  async delete(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};
