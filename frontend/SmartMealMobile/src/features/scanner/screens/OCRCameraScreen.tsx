import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView } from 'expo-camera';
import { CheckCircle2, Image as ImageIcon, X, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { AppButton, AppChip, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useLiveCamera } from '../hooks/useLiveCamera';
import { pickPhoto } from '../services/photoService';

type Props = NativeStackScreenProps<MainStackParamList, 'OCRCamera'>;

const TIPS = ['Chụp thẳng', 'Đủ sáng', 'Giữ chắc tay'];

// design/OCRCamera.dc.html (BR-130→132). Camera xem trực tiếp (expo-camera) để canh nhãn vào khung rồi chụp,
// hoặc chọn ảnh từ thư viện → OCRReview — ảnh được AI phía server đọc (POST /ai/scan-label). Chưa cấp quyền
// camera thì hiện nút xin quyền; từ chối hẳn thì mở StatePermission.
export function OCRCameraScreen({ navigation, route }: Props) {
  const { mealType } = route.params;
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const { permission, requestPermission, cameraRef, torch, toggleTorch, zoom, resetZoom, zoomGesture, capture } =
    useLiveCamera();
  const canUseCamera = permission?.granted === true;

  const openPermissionHelp = () =>
    navigation.replace(MAIN_STACK_ROUTES.STATE_PERMISSION, { mealType, returnTo: 'Barcode' });

  const withBusy = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch {
      // Chụp/chọn ảnh lỗi (camera chưa sẵn sàng...): ở lại màn này để thử lại.
    } finally {
      setBusy(false);
    }
  };

  const handleCapture = () =>
    withBusy(async () => {
      const uri = await capture();
      if (uri) navigation.replace(MAIN_STACK_ROUTES.OCR_REVIEW, { mealType, imageUri: uri });
    });

  const handlePick = () =>
    withBusy(async () => {
      const result = await pickPhoto();
      if (result === 'denied') {
        openPermissionHelp();
      } else if (result) {
        navigation.replace(MAIN_STACK_ROUTES.OCR_REVIEW, { mealType, imageUri: result.uri });
      }
    });

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
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, { mealType })}
          />
          <AppText variant="bodyMedium" className="text-on-overlay">
            Quét sản phẩm
          </AppText>
          <View className="h-[44px] w-[44px]" />
        </View>

        <View className="flex-row justify-center gap-xs pt-md">
          <AppChip
            label="Mã vạch"
            onPress={() => navigation.replace(MAIN_STACK_ROUTES.BARCODE, { mealType })}
          />
          <AppChip label="Nhãn dinh dưỡng" selected onPress={() => {}} />
        </View>

        <View className="flex-1 items-center justify-center gap-md px-lg">
          <View className="h-[240px] w-[300px] items-start rounded-lg border-2 border-dashed border-on-overlay/80 p-sm">
            <AppText variant="caption" className="rounded-pill bg-on-overlay/15 px-sm py-xxs text-on-overlay">
              Nutrition Facts
            </AppText>
          </View>
          <View className="items-center gap-sm rounded-lg bg-overlay/50 px-md py-sm">
            <AppText variant="body" className="text-center text-on-overlay">
              Đặt bảng thành phần dinh dưỡng vào khung
            </AppText>
            <View className="flex-row gap-md">
              {TIPS.map(tip => (
                <View key={tip} className="flex-row items-center gap-xxs">
                  <CheckCircle2 size={14} color={colors.onOverlay} />
                  <AppText variant="caption" className="text-on-overlay opacity-80">
                    {tip}
                  </AppText>
                </View>
              ))}
            </View>
            <AppText variant="caption" className="text-center text-on-overlay opacity-80">
              Chữ nhỏ? Để máy xa hơn một chút rồi chụm 2 ngón để phóng to
            </AppText>
          </View>
          {zoom > 0 ? <AppChip label="Về 1x" onPress={resetZoom} /> : null}
          {permission && !canUseCamera ? (
            <AppButton
              label="Cho phép camera để quét"
              variant="secondary"
              onPress={() => void handleRequestPermission()}
            />
          ) : null}
        </View>

        <View className="flex-row items-center justify-around px-md pb-[48px] pt-lg">
          <AppIconButton
            accessibilityLabel="Chọn từ thư viện ảnh"
            icon={<ImageIcon size={22} color={colors.onOverlay} />}
            className="bg-on-overlay/15"
            disabled={busy}
            onPress={() => void handlePick()}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chụp"
            accessibilityState={{ busy, disabled: !canUseCamera }}
            disabled={busy || !canUseCamera}
            onPress={() => void handleCapture()}
            className={`h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-on-overlay ${canUseCamera ? '' : 'opacity-40'}`}
          >
            <View className="h-[60px] w-[60px] rounded-full bg-on-overlay" />
          </Pressable>
          <AppIconButton
            accessibilityLabel={torch ? 'Tắt đèn flash' : 'Bật đèn flash'}
            icon={<Zap size={22} color={torch ? colors.warning : colors.onOverlay} />}
            className="bg-on-overlay/15"
            disabled={!canUseCamera}
            onPress={toggleTorch}
          />
        </View>
      </View>
    </GestureDetector>
  );
}
