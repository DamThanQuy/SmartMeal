import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, RefreshCw, Settings, X, Zap } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppButton, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useAiQuota } from '../hooks/useAiQuota';

type Props = NativeStackScreenProps<MainStackParamList, 'AICamera'>;

export function AICameraScreen({ navigation, route }: Props) {
  const { mealType } = route.params;
  const { colors } = useTheme();
  const { remaining, limit, isUnlimited } = useAiQuota();

  // Tự động yêu cầu quyền camera ngay khi người dùng vào màn hình (request: true)
  const [permission, requestPermission] = useCameraPermissions({ request: true });
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleRequestPermission = async () => {
    try {
      const res = await requestPermission();
      // Nếu quyền đã bị từ chối vĩnh viễn (hệ điều hành không hiện lại popup) -> mở Cài đặt máy
      if (!res.granted && !res.canAskAgain) {
        await Linking.openSettings();
      }
    } catch {
      await Linking.openSettings();
    }
  };

  const handleCapture = async () => {
    if (isCapturing) return;
    try {
      setIsCapturing(true);
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: false,
        });
        if (photo?.uri) {
          navigation.navigate(MAIN_STACK_ROUTES.AI_ANALYZING, {
            mealType,
            imageUri: photo.uri,
          });
          return;
        }
      }
      navigation.navigate(MAIN_STACK_ROUTES.AI_ANALYZING, { mealType });
    } catch {
      navigation.navigate(MAIN_STACK_ROUTES.AI_ANALYZING, { mealType });
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        navigation.navigate(MAIN_STACK_ROUTES.AI_ANALYZING, {
          mealType,
          imageUri: result.assets[0].uri,
        });
      }
    } catch {
      // Bỏ qua nếu người dùng hủy chọn
    }
  };

  // Trạng thái đang kiểm tra quyền
  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-overlay">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Chưa cấp quyền camera (thiết bị mới hoặc chưa cho phép)
  if (!permission.granted) {
    return (
      <View className="flex-1 bg-overlay px-lg justify-between py-[52px]">
        <View className="flex-row items-center justify-between">
          <AppIconButton
            accessibilityLabel="Đóng"
            icon={<X size={22} color={colors.onPrimary} />}
            className="bg-on-primary/15"
            onPress={() => navigation.goBack()}
          />
          <AppText variant="bodyMedium" className="text-on-primary font-semibold">
            Chụp món ăn
          </AppText>
          <View className="w-10" />
        </View>

        <View className="items-center gap-md">
          <View className="h-[80px] w-[80px] items-center justify-center rounded-full bg-primary-soft shadow-md">
            <Camera size={40} color={colors.primary} />
          </View>
          <AppText variant="h2" className="text-center text-on-primary">
            Cần quyền truy cập máy ảnh
          </AppText>
          <AppText variant="body" className="text-center text-on-primary/80">
            SmartMeal cần quyền dùng camera để chụp và tự động phân tích hàm lượng dinh dưỡng, calo trong đĩa ăn của bạn.
          </AppText>

          <View className="w-full gap-sm mt-md">
            <AppButton
              label="Cho phép truy cập camera"
              onPress={handleRequestPermission}
            />
            <AppButton
              label="Mở cài đặt máy"
              variant="outline"
              onPress={() => Linking.openSettings()}
            />
            <AppButton
              label="Chọn ảnh từ thư viện"
              variant="outline"
              onPress={handlePickImage}
            />
            <AppButton
              label="Nhập món thủ công"
              variant="text"
              onPress={() =>
                navigation.replace(MAIN_STACK_ROUTES.FOOD_SEARCH, { mealType })
              }
            />
          </View>

          <AppText variant="caption" className="text-center text-on-primary/60 mt-xs">
            Lưu ý: Nếu dùng Expo Go, hãy chắc chắn ứng dụng Expo Go đã được cấp quyền Camera trong Cài đặt của điện thoại.
          </AppText>
        </View>

        <View />
      </View>
    );
  }

  // Đã có quyền: Hiển thị CameraView trực tiếp
  return (
    <View className="flex-1 bg-overlay">
      <CameraView
        ref={cameraRef}
        facing={facing}
        enableTorch={torch}
        style={StyleSheet.absoluteFill}
      />

      <View className="flex-1 justify-between">
        {/* Thanh tiêu đề trên */}
        <View className="flex-row items-center justify-between px-md pt-[52px]">
          <AppIconButton
            accessibilityLabel="Đóng"
            icon={<X size={22} color={colors.onPrimary} />}
            className="bg-overlay/40"
            onPress={() => navigation.goBack()}
          />
          <AppText variant="bodyMedium" className="text-on-primary font-semibold">
            Chụp món ăn
          </AppText>
          <AppIconButton
            accessibilityLabel="Đèn flash"
            icon={<Zap size={22} color={torch ? '#FACC15' : colors.onPrimary} />}
            className={torch ? 'bg-overlay/70 border border-yellow-400/60' : 'bg-overlay/40'}
            onPress={() => setTorch(prev => !prev)}
          />
        </View>

        {/* Khung ngắm đĩa ăn */}
        <View className="items-center justify-center gap-sm">
          <View className="h-[290px] w-[290px] rounded-full border-2 border-dashed border-on-primary/80 shadow-lg" />
          <View className="rounded-full bg-overlay/50 px-md py-xs">
            <AppText variant="body" className="text-on-primary">
              Đặt đĩa ăn vào khung · chụp từ trên xuống
            </AppText>
          </View>
          <View className="rounded-full bg-overlay/50 px-sm py-xxs">
            <AppText variant="caption" className="text-on-primary opacity-90">
              {isUnlimited ? 'Pro: dùng AI không giới hạn' : `Còn ${remaining}/${limit} lượt AI hôm nay`}
            </AppText>
          </View>
        </View>

        {/* Cụm điều khiển chụp bên dưới */}
        <View className="flex-row items-center justify-around px-md pb-[48px] pt-lg bg-overlay/30">
          <AppIconButton
            accessibilityLabel="Chọn từ thư viện ảnh"
            icon={<ImageIcon size={22} color={colors.onPrimary} />}
            className="bg-overlay/50"
            onPress={handlePickImage}
            disabled={isCapturing}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chụp"
            onPress={handleCapture}
            disabled={isCapturing}
            className="h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-on-primary active:scale-95"
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <View className="h-[60px] w-[60px] rounded-full bg-on-primary" />
            )}
          </Pressable>
          <AppIconButton
            accessibilityLabel="Đổi camera"
            icon={<RefreshCw size={22} color={colors.onPrimary} />}
            className="bg-overlay/50"
            onPress={() => setFacing(prev => (prev === 'back' ? 'front' : 'back'))}
            disabled={isCapturing}
          />
        </View>
      </View>
    </View>
  );
}
