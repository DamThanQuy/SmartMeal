import * as Clipboard from 'expo-clipboard';

/** Chép chữ vào bộ nhớ tạm của máy (expo-clipboard — native chỉ đi qua service, CLAUDE.md mục 9). */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    return await Clipboard.setStringAsync(text);
  } catch {
    return false;
  }
}
