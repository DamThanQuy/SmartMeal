import * as ImagePicker from 'expo-image-picker';

export async function pickMealImage(): Promise<string | undefined> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return undefined;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    allowsEditing: false,
  });
  return result.canceled ? undefined : result.assets[0]?.uri;
}