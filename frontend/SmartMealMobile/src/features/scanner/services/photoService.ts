import * as ImagePicker from 'expo-image-picker';

// Chọn ảnh từ thư viện cho Fridge Scanner và quét nhãn (expo-image-picker — chạy được trên Expo Go); chụp
// trực tiếp dùng camera trong màn (hooks/useLiveCamera). Trả 'denied' khi người dùng từ chối quyền để màn
// hình mở StatePermission; huỷ chọn trả undefined (KHÔNG được coi là đã có ảnh — review PR #9 S3).

export type PhotoResult = { uri: string } | 'denied' | undefined;

const OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: false };

export async function pickPhoto(): Promise<PhotoResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return 'denied';
  const result = await ImagePicker.launchImageLibraryAsync(OPTIONS);
  const uri = result.canceled ? undefined : result.assets[0]?.uri;
  return uri ? { uri } : undefined;
}
