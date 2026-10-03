import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  async getString(key: string): Promise<string | undefined> {
    return (await SecureStore.getItemAsync(key)) ?? undefined;
  },
  async setString(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async delete(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};