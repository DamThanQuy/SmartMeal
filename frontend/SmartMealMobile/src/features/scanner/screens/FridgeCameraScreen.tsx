import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image as ImageIcon, ShieldCheck, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { AppBadge, AppButton, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { pickPhoto, takePhoto, type PhotoResult } from '../services/photoService';

type Props = NativeStackScreenProps<MainStackParamList, 'FridgeCamera'>;

const MAX_PHOTOS = 4;

// design/FridgeCamera.dc.html (BR-080→083). Chỉ Pro — Discovery chặn Free trước khi vào. Chụp/chọn tối
// đa 4 ảnh thật (expo-image-picker); chỉ ảnh thật được đếm — huỷ chụp không tạo "ảnh" nào và không bao
// giờ gửi ảnh mẫu (review PR #9 S3). "Xong" chuyển các ảnh sang FridgeScreen để nhận diện.
export function FridgeCameraScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const isFull = photoUris.length >= MAX_PHOTOS;

  const addPhoto = async (source: () => Promise<PhotoResult>) => {
    if (busy || isFull) return;
    setBusy(true);
    try {
      const result = await source();
      if (result === 'denied') {
        navigation.replace(MAIN_STACK_ROUTES.STATE_PERMISSION, { returnTo: 'Fridge' });
      } else if (result) {
        setPhotoUris(current => [...current, result.uri].slice(0, MAX_PHOTOS));
      }
    } finally {
      setBusy(false);
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

        {photoUris.length > 0 ? (
          <View className="flex-row items-center gap-sm">
            <View className="flex-row gap-xs">
              {photoUris.map((uri, index) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  accessibilityLabel={`Ảnh ${index + 1}`}
                  className="h-[56px] w-[56px] rounded-md border-2 border-on-primary"
                />
              ))}
            </View>
            <AppText variant="caption" className="text-on-primary opacity-80">
              {isFull ? `${photoUris.length} ảnh (tối đa)` : `${photoUris.length} ảnh · chụp thêm ngăn đông, ngăn rau`}
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
          disabled={busy || isFull}
          onPress={() => void addPhoto(pickPhoto)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chụp"
          accessibilityState={{ busy, disabled: isFull }}
          disabled={busy || isFull}
          onPress={() => void addPhoto(takePhoto)}
          className="h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-on-primary"
        >
          <View className="h-[60px] w-[60px] rounded-full bg-on-primary" />
        </Pressable>
        <AppButton
          label={`Xong · ${photoUris.length}`}
          variant="secondary"
          disabled={photoUris.length === 0}
          onPress={() => navigation.replace(MAIN_STACK_ROUTES.FRIDGE, { imageUris: photoUris })}
          className="h-[44px] px-md"
        />
      </View>
    </View>
  );
}
