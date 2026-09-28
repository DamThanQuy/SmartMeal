import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Heart } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppText } from '@/components/ui';
import type { MainStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/state/auth/authStore';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'GuestPrompt'>;

// design/GuestPrompt.dc.html (design v2, Đợt 9, BR §2.1). Mở khi Guest bấm hành động cần tài
// khoản (yêu thích, thêm vào thực đơn, ghi nhật ký) — presentation:'transparentModal' khai báo
// ở MainNavigator, cùng nhóm với StateAILimit/DeleteConfirm/FilterSheet.
//
// "Đăng nhập"/"Tạo tài khoản" trong artboard trỏ thẳng Main.dc.html/Register.dc.html, nhưng Guest
// hiện đang ở trong MainNavigator (AppNavigator render Main khi isGuest — xem authStore.ts) nên
// không thể navigate() thẳng sang 1 route chỉ tồn tại trong AuthNavigator (2 navigator gốc không
// lồng nhau). Cả 2 nút tạm dùng chung logout('guest') để thoát Guest — AppNavigator tự chuyển sang
// AuthNavigator (initialRouteName=Welcome, vì lastExitReason='guest' — xem AuthNavigator.tsx),
// người dùng bấm thêm 1 lần "Tôi đã có tài khoản"/"Bắt đầu miễn phí" từ đó. Đây là lệch nhỏ so với
// design — CẦN quyết định thêm nếu muốn tách hẳn 2 đích Login/Register (ví dụ: không còn
// conditional-render Auth/Main mà giữ cả 2 navigator luôn mount và reset() giữa chúng).
export function GuestPromptScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const logout = useAuthStore(state => state.logout);
  const exitGuestMode = () => logout('guest');

  return (
    <View className="flex-1 justify-end">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đóng"
        className="absolute inset-0 bg-overlay/45"
        onPress={() => navigation.goBack()}
      />
      <View
        className="gap-lg rounded-t-sheet bg-surface p-lg"
        style={[shadows.elevated, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <View className="h-[4px] w-[40px] self-center rounded-pill bg-border" />
        <View className="items-center gap-sm">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft">
            <Heart size={34} color={colors.primary} />
          </View>
          <AppText variant="h1" className="text-center">
            Đăng nhập để lưu công thức
          </AppText>
          <AppText variant="body" color="secondary" className="text-center">
            Khách có thể xem công thức và giới thiệu ứng dụng. Lưu yêu thích, ghi nhật ký và theo
            dõi tiến độ cần có tài khoản.
          </AppText>
        </View>

        <View className="gap-sm">
          <AppButton label="Đăng nhập" onPress={exitGuestMode} />
          <AppButton label="Tạo tài khoản" variant="secondary" onPress={exitGuestMode} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Để sau"
            className="min-h-[44px] items-center justify-center"
            onPress={() => navigation.goBack()}
          >
            <AppText variant="bodyMedium" color="onPrimarySoft">
              Để sau
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
