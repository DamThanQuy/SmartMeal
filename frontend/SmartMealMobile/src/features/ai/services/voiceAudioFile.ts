import { File, Paths } from 'expo-file-system';

// Ghi đoạn ghi âm (WAV) ra thư mục cache để gửi multipart lên backend và nghe lại. Native (expo-file-system)
// chỉ đi qua service này (CLAUDE.md mục 9).

/** Ghi (đè) file `fileName` trong cache, trả `file://` URI. */
export function writeVoiceFile(fileName: string, bytes: Uint8Array): string {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(bytes);
  return file.uri;
}

/** Xóa file đã ghi nếu còn; bỏ qua lỗi (file cache, hệ điều hành cũng có thể tự dọn). */
export function deleteVoiceFile(uri: string | null | undefined) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Không ảnh hưởng luồng ghi âm.
  }
}
