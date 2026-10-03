import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SECURE_KEYS } from '@/constants/storage';
import { storageService } from './storage';

// Access token chỉ lưu ở expo-secure-store (CLAUDE.md mục 9; .claude/rules/state-and-api.md) —
// không đưa vào AsyncStorage/Zustand persist thường.
//
// Cache trong bộ nhớ: interceptor chạy ở MỌI request nên không đọc SecureStore (bất đồng bộ,
// chậm) mỗi lần. undefined = chưa đọc từ storage; null = đã đọc và không có token.
let cachedToken: string | null | undefined;

// expo-secure-store KHÔNG chạy trên web (`npx expo start --web`) → fallback AsyncStorage
// (localStorage). CHỈ để dev trên trình duyệt, không phải nơi lưu token an toàn.
function isWeb(): boolean {
  return Platform.OS === 'web';
}

async function readPersistedToken(): Promise<string | null> {
  try {
    if (isWeb()) {
      return (await storageService.getString(SECURE_KEYS.ACCESS_TOKEN)) ?? null;
    }
    return await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  } catch {
    // Keystore lỗi/hỏng → coi như chưa đăng nhập thay vì làm app crash lúc khởi động.
    return null;
  }
}

async function writePersistedToken(token: string): Promise<void> {
  if (isWeb()) {
    await storageService.setString(SECURE_KEYS.ACCESS_TOKEN, token);
    return;
  }
  await SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, token);
}

async function deletePersistedToken(): Promise<void> {
  if (isWeb()) {
    await storageService.delete(SECURE_KEYS.ACCESS_TOKEN);
    return;
  }
  await SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN);
}

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (cachedToken !== undefined) return cachedToken;
    cachedToken = await readPersistedToken();
    return cachedToken;
  },

  /** Cập nhật cache trước: nếu ghi xuống storage lỗi thì phiên hiện tại vẫn dùng được token. */
  async set(token: string): Promise<void> {
    cachedToken = token;
    try {
      await writePersistedToken(token);
    } catch {
      // Chỉ mất khả năng khôi phục phiên sau khi tắt app — người dùng đăng nhập lại.
    }
  },

  async clear(): Promise<void> {
    cachedToken = null;
    try {
      await deletePersistedToken();
    } catch {
      // Cache đã xóa nên request kế tiếp không còn gắn token; lỗi xóa storage không chặn đăng xuất.
    }
  },
};
