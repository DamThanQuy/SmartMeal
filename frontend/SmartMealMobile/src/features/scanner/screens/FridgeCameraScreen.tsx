import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2, Image as ImageIcon, ShieldCheck, X } from 'lucide-react-native';
import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, View } from 'react-native';
import { AppBadge, AppButton, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'FridgeCamera'>;

const MAX_PHOTOS = 4;

export function FridgeCameraScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [photoCount, setPhotoCount] = useState(0);
  const [selectedUri, setSelectedUri] = useState<string | undefined>();

  const handleCapture = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        setSelectedUri(res.assets[0].uri);
        setPhotoCount(count => Math.min(count + 1, MAX_PHOTOS));
        return;
      }
    } catch {
      // Bỏ qua lỗi launchCamera trên môi trường không hỗ trợ (web/mock)
    }
    setPhotoCount(count => Math.min(count + 1, MAX_PHOTOS));
  };

  const handlePickFromGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        setSelectedUri(res.assets[0].uri);
        setPhotoCount(1);
      }
    } catch {
      // ignore
    }
  };

  return (
    <View className="flex-1 bg-overlay">
      <View className="flex-row items-center justify-between px-md pt-[52px]">
        <AppIconButton
          accessibilityLabel="Đóng"
          icon={<X size={22} color={colors.onPrimary} />}
          className="bg-on-primary/15"
          onPress={() => navigation.goBack()}
        />
        <AppText variant="bodyMedium" className="text-on-primary">
          Quét tủ lạnh
        </AppText>
        <AppBadge label="Pro" icon={<ShieldCheck size={14} color={colors.onPrimarySoft} />} />
      </View>

      <View className="flex-1 items-center justify-center gap-md px-lg">
        <View className="h-[300px] w-[300px] items-end justify-end rounded-lg border-2 border-on-primary/75 p-sm">
          <AppText variant="caption" className="rounded-pill bg-on-primary/15 px-sm py-xxs text-on-primary">
            Ngăn mát
          </AppText>
        </View>
        <AppText variant="body" className="text-center text-on-primary">
          Mở cửa tủ, chụp toàn cảnh từng ngăn để nhận diện đủ nguyên liệu
        </AppText>

        {photoCount > 0 ? (
          <View className="flex-row items-center gap-sm">
            <View className="flex-row gap-xs">
              {Array.from({ length: photoCount }).map((_, index) => (
                <View
                  key={index}
                  className="h-[56px] w-[56px] items-center justify-center rounded-md border-2 border-on-primary bg-on-primary/15"
                >
                  <CheckCircle2 size={20} color={colors.onPrimary} />
                </View>
              ))}
            </View>
            <AppText variant="caption" className="text-on-primary opacity-80">
              {`${photoCount} ảnh · chụp thêm ngăn đông, ngăn rau`}
            </AppText>
          </View>
        ) : null}

        <View className="flex-row items-center gap-xxs">
          <ShieldCheck size={14} color={colors.onPrimary} />
          <AppText variant="caption" className="text-on-primary opacity-80">
            Bạn cần xác nhận nguyên liệu trước khi gợi ý món
          </AppText>
        </View>
      </View>

      <View className="flex-row items-center justify-around px-md pb-[48px] pt-lg">
        <AppIconButton
          accessibilityLabel="Chọn từ thư viện ảnh"
          icon={<ImageIcon size={22} color={colors.onPrimary} />}
          className="bg-on-primary/15"
          onPress={handlePickFromGallery}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chụp"
          onPress={handleCapture}
          className="h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-on-primary"
        >
          <View className="h-[60px] w-[60px] rounded-full bg-on-primary" />
        </Pressable>
        <AppButton
          label={`Xong · ${photoCount}`}
          variant="secondary"
          disabled={photoCount === 0}
          onPress={() => navigation.replace(MAIN_STACK_ROUTES.FRIDGE, { imageUri: selectedUri })}
          className="h-[44px] px-md"
        />
      </View>
    </View>
  );
}
