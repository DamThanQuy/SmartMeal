import * as ImagePicker from 'expo-image-picker';

/** Ảnh đại diện đã chọn, sẵn sàng tải lên (BE nhận jpg/png/webp, tối đa 2 MB). */
export interface PickedAvatar {
  uri: string;
  mimeType: string;
  fileName: string;
  /** Dung lượng (byte) nếu hệ điều hành báo được. */
  fileSize?: number;
}

/**
 * Mở thư viện ảnh để chọn ảnh đại diện (cắt vuông, nén JPEG ~0,7 để nhỏ hơn giới hạn 2 MB). Native
 * chỉ đi qua service này (CLAUDE.md mục 9). Trả undefined khi người dùng hủy.
 */
export async function pickAvatar(): Promise<PickedAvatar | undefined> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled) return undefined;

  const asset = result.assets[0];
  if (!asset) return undefined;
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    fileName: asset.fileName ?? 'avatar.jpg',
    fileSize: asset.fileSize,
  };
}
