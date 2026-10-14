import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SECURE_KEYS } from '@/constants/storage';
import { storageService } from './storage';

function isWeb(): boolean {
  return Platform.OS === 'web';
}

/**
 * Một giá trị nhạy cảm ở expo-secure-store, có cache trong bộ nhớ (đọc keychain mỗi request là
 * quá chậm). Web không có SecureStore nên rơi về AsyncStorage.
 */
function createSecureSlot(key: string) {
  let cached: string | null | undefined;

  async function readPersisted(): Promise<string | null> {
    try {
      if (isWeb()) return (await storageService.getString(key)) ?? null;
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  }

  async function writePersisted(value: string): Promise<void> {
    if (isWeb()) return storageService.setString(key, value);
    await SecureStore.setItemAsync(key, value);
  }

  async function deletePersisted(): Promise<void> {
    if (isWeb()) return storageService.delete(key);
    await SecureStore.deleteItemAsync(key);
  }

  return {
    async get(): Promise<string | null> {
      if (cached !== undefined) return cached;
      cached = await readPersisted();
      return cached;
    },
    async set(value: string): Promise<void> {
      cached = value;
      try {
        await writePersisted(value);
      } catch {
        // Phiên vẫn dùng được trong bộ nhớ nếu không ghi được xuống máy.
      }
    },
    async clear(): Promise<void> {
      cached = null;
      try {
        await deletePersisted();
      } catch {
        // Bản trong bộ nhớ đã xóa.
      }
    },
  };
}

/** Access token (JWT) gắn vào mọi request. */
export const tokenStorage = createSecureSlot(SECURE_KEYS.ACCESS_TOKEN);

/** Refresh token dùng một lần để lấy cặp token mới khi access token hết hạn. */
export const refreshTokenStorage = createSecureSlot(SECURE_KEYS.REFRESH_TOKEN);

/** Lưu cặp token vừa nhận từ login/register/google/refresh/change-password. */
export async function saveSessionTokens(tokens: {
  token: string;
  refreshToken?: string | null;
}): Promise<void> {
  await tokenStorage.set(tokens.token);
  if (tokens.refreshToken) await refreshTokenStorage.set(tokens.refreshToken);
}

/** Xóa cả hai token (đăng xuất, hết phiên). */
export async function clearSessionTokens(): Promise<void> {
  await tokenStorage.clear();
  await refreshTokenStorage.clear();
}
