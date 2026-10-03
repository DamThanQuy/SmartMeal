import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SECURE_KEYS } from '@/constants/storage';
import { storageService } from './storage';

let cachedToken: string | null | undefined;

function isWeb(): boolean {
  return Platform.OS === 'web';
}

async function readPersistedToken(): Promise<string | null> {
  try {
    if (isWeb()) return (await storageService.getString(SECURE_KEYS.ACCESS_TOKEN)) ?? null;
    return await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
  } catch {
    return null;
  }
}

async function writePersistedToken(token: string): Promise<void> {
  if (isWeb()) return storageService.setString(SECURE_KEYS.ACCESS_TOKEN, token);
  await SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, token);
}

async function deletePersistedToken(): Promise<void> {
  if (isWeb()) return storageService.delete(SECURE_KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN);
}

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (cachedToken !== undefined) return cachedToken;
    cachedToken = await readPersistedToken();
    return cachedToken;
  },
  async set(token: string): Promise<void> {
    cachedToken = token;
    try {
      await writePersistedToken(token);
    } catch {
      // Session remains usable if persistence is unavailable.
    }
  },
  async clear(): Promise<void> {
    cachedToken = null;
    try {
      await deletePersistedToken();
    } catch {
      // In-memory token is already cleared.
    }
  },
};
