import * as ImagePicker from 'expo-image-picker';

/** Ảnh đại diện đã chọn, sẵn sàng tải lên (BE nhận jpg/png/webp, tối đa 2 MB). */
export interface PickedAvatar {
  uri: string;
  mimeType: string;
  fileName: string;
  /** Dung lượng (byte) nếu hệ điều hành báo được. */
  fileSize?: number;
}

/** Người dùng không cho SmartMeal dùng camera — màn hình báo kèm cách bật lại. */
export class CameraPermissionDeniedError extends Error {
  constructor() {
    super('SmartMeal chưa được cấp quyền camera. Hãy bật lại trong Cài đặt của máy.');
  }
}

// Cắt vuông, nén JPEG ~0,5 để ảnh chụp bằng camera độ phân giải cao vẫn nhỏ hơn giới hạn 2 MB.
const AVATAR_IMAGE_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.5,
};

function toPickedAvatar(result: ImagePicker.ImagePickerResult): PickedAvatar | undefined {
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

/**
 * Mở thư viện ảnh để chọn ảnh đại diện. Native chỉ đi qua service này (CLAUDE.md mục 9). Trả undefined
 * khi người dùng hủy.
 */
export async function pickAvatar(): Promise<PickedAvatar | undefined> {
  return toPickedAvatar(await ImagePicker.launchImageLibraryAsync(AVATAR_IMAGE_OPTIONS));
}

/** Chụp ảnh đại diện mới bằng camera trước. Trả undefined khi người dùng hủy. */
export async function takeAvatarPhoto(): Promise<PickedAvatar | undefined> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new CameraPermissionDeniedError();

  return toPickedAvatar(
    await ImagePicker.launchCameraAsync({
      ...AVATAR_IMAGE_OPTIONS,
      cameraType: ImagePicker.CameraType.front,
    }),
  );
}
