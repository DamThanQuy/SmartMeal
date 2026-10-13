import * as ImagePicker from 'expo-image-picker';

// Chụp/chọn ảnh cho Fridge Scanner và quét nhãn (expo-image-picker — chạy được trên Expo Go). Trả
// 'denied' khi người dùng từ chối quyền để màn hình mở StatePermission; huỷ chụp trả undefined
// (KHÔNG được coi là đã có ảnh — review PR #9 S3).

export type PhotoResult = { uri: string } | 'denied' | undefined;

const OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: false };

export async function takePhoto(): Promise<PhotoResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return 'denied';
  const result = await ImagePicker.launchCameraAsync(OPTIONS);
  const uri = result.canceled ? undefined : result.assets[0]?.uri;
  return uri ? { uri } : undefined;
}

export async function pickPhoto(): Promise<PhotoResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return 'denied';
  const result = await ImagePicker.launchImageLibraryAsync(OPTIONS);
  const uri = result.canceled ? undefined : result.assets[0]?.uri;
  return uri ? { uri } : undefined;
}
