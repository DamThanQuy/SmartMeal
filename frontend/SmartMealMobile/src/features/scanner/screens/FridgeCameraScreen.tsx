import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView } from 'expo-camera';
import { Image as ImageIcon, ShieldCheck, X, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { AppBadge, AppButton, AppChip, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useLiveCamera } from '../hooks/useLiveCamera';
import { pickPhoto } from '../services/photoService';

type Props = NativeStackScreenProps<MainStackParamList, 'FridgeCamera'>;

const MAX_PHOTOS = 4;

// design/FridgeCamera.dc.html (BR-080→083). Chỉ Pro — Discovery chặn Free trước khi vào. Camera xem trực
// tiếp (expo-camera) để chụp từng ngăn, hoặc chọn từ thư viện — tối đa 4 ảnh thật; chỉ ảnh thật được đếm,
// không bao giờ gửi ảnh mẫu (review PR #9 S3). "Xong" chuyển các ảnh sang FridgeScreen để nhận diện.
export function FridgeCameraScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { permission, requestPermission, cameraRef, torch, toggleTorch, zoom, resetZoom, zoomGesture, capture } =
    useLiveCamera();
  const canUseCamera = permission?.granted === true;
  const isFull = photoUris.length >= MAX_PHOTOS;

  const openPermissionHelp = () => navigation.replace(MAIN_STACK_ROUTES.STATE_PERMISSION, { returnTo: 'Fridge' });

  const addPhoto = async (source: () => Promise<string | 'denied' | undefined>) => {
    if (busy || isFull) return;
    setBusy(true);
    try {
      const result = await source();
      if (result === 'denied') {
        openPermissionHelp();
      } else if (result) {
        setPhotoUris(current => [...current, result].slice(0, MAX_PHOTOS));
      }
    } catch {
      // Chụp/chọn ảnh lỗi (camera chưa sẵn sàng...): giữ các ảnh đã có, thử lại.
    } finally {
      setBusy(false);
    }
  };

  const pickFromLibrary = async () => {
    const result = await pickPhoto();
    return result === 'denied' ? 'denied' : result?.uri;
  };

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (!result.granted && !result.canAskAgain) openPermissionHelp();
  };

  return (
    <GestureDetector gesture={zoomGesture}>
      <View className="flex-1 bg-overlay">
        {canUseCamera ? (
          <CameraView
            ref={cameraRef}
            facing="back"
            enableTorch={torch}
            zoom={zoom}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View className="flex-row items-center justify-between px-md pt-[52px]">
          <AppIconButton
            accessibilityLabel="Đóng"
            icon={<X size={22} color={colors.onOverlay} />}
            className="bg-on-overlay/15"
            onPress={() => navigation.goBack()}
          />
          <AppText variant="bodyMedium" className="text-on-overlay">
            Quét tủ lạnh
          </AppText>
          <View className="flex-row items-center gap-xs">
            <AppBadge label="Pro" icon={<ShieldCheck size={14} color={colors.onPrimarySoft} />} />
            <AppIconButton
              accessibilityLabel={torch ? 'Tắt đèn flash' : 'Bật đèn flash'}
              icon={<Zap size={22} color={torch ? colors.warning : colors.onOverlay} />}
              className="bg-on-overlay/15"
              disabled={!canUseCamera}
              onPress={toggleTorch}
            />
          </View>
        </View>

        <View className="flex-1 items-center justify-center gap-md px-lg">
          <View className="h-[300px] w-[300px] items-end justify-end rounded-lg border-2 border-on-overlay/75 p-sm">
            <AppText variant="caption" className="rounded-pill bg-on-overlay/15 px-sm py-xxs text-on-overlay">
              Ngăn mát
            </AppText>
          </View>
          <View className="rounded-lg bg-overlay/50 px-md py-sm">
            <AppText variant="body" className="text-center text-on-overlay">
              Mở cửa tủ, chụp toàn cảnh từng ngăn để nhận diện đủ nguyên liệu
            </AppText>
          </View>
          {zoom > 0 ? <AppChip label="Về 1x" onPress={resetZoom} /> : null}
          {permission && !canUseCamera ? (
            <AppButton
              label="Cho phép camera để chụp"
              variant="secondary"
              onPress={() => void handleRequestPermission()}
            />
          ) : null}

          {photoUris.length > 0 ? (
            <View className="flex-row items-center gap-sm">
              <View className="flex-row gap-xs">
                {photoUris.map((uri, index) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    accessibilityLabel={`Ảnh ${index + 1}`}
                    className="h-[56px] w-[56px] rounded-md border-2 border-on-overlay"
                  />
                ))}
              </View>
              <AppText variant="caption" className="text-on-overlay opacity-80">
                {isFull ? `${photoUris.length} ảnh (tối đa)` : `${photoUris.length} ảnh · chụp thêm ngăn đông, ngăn rau`}
              </AppText>
            </View>
          ) : null}

          <View className="flex-row items-center gap-xxs">
            <ShieldCheck size={14} color={colors.onOverlay} />
            <AppText variant="caption" className="text-on-overlay opacity-80">
              Bạn cần xác nhận nguyên liệu trước khi gợi ý món
            </AppText>
          </View>
        </View>

        <View className="flex-row items-center justify-around px-md pb-[48px] pt-lg">
          <AppIconButton
            accessibilityLabel="Chọn từ thư viện ảnh"
            icon={<ImageIcon size={22} color={colors.onOverlay} />}
            className="bg-on-overlay/15"
            disabled={busy || isFull}
            onPress={() => void addPhoto(pickFromLibrary)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chụp"
            accessibilityState={{ busy, disabled: isFull || !canUseCamera }}
            disabled={busy || isFull || !canUseCamera}
            onPress={() => void addPhoto(capture)}
            className={`h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-on-overlay ${canUseCamera && !isFull ? '' : 'opacity-40'}`}
          >
            <View className="h-[60px] w-[60px] rounded-full bg-on-overlay" />
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
    </GestureDetector>
  );
}
