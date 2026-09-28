import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShieldAlert } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { AppButton, AppText } from '@/components/ui';
import type { MainStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/state/auth/authStore';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'StateSession'>;

// design/StateSession.dc.html (design v2, Đợt 9, BR-013 tài khoản bị khóa / BR-014 session
// management). Artboard vẽ 2 trạng thái chồng lên nhau kèm ghi chú "(mẫu)" — cùng cách làm với
// PaymentPendingScreen (Đợt 8): dựng thành 2 state loại trừ nhau qua route.params.variant, không
// hiện đồng thời. Mô phỏng qua nút demo trong ThemePreviewScreen (Cài đặt → Dev), chưa có API
// thật trả 401/423 để tự trigger.
//
// "Đăng nhập lại" gọi logout(variant) — authStore lưu lastExitReason='expired'|'locked',
// AuthNavigator đọc giá trị này và mở thẳng Login (không qua Welcome, đúng artboard gốc — xem
// AuthNavigator.tsx). "Đăng xuất" vẫn gọi logout() mặc định ('logout') → về Welcome, giống
// GuestPromptScreen.tsx/DeleteDataScreen.tsx.
export function StateSessionScreen({ route }: Props) {
  const { variant } = route.params;
  const { colors } = useTheme();
  const logout = useAuthStore(state => state.logout);
  const handleReLogin = () => logout(variant);
  const handleLogout = () => logout();

  return (
    <View className="flex-1 gap-lg px-md pb-xl pt-[52px]">
      <View className="flex-1 items-center justify-center gap-sm px-lg">
        <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft">
          <ShieldAlert size={34} color={colors.primary} />
        </View>
        <AppText variant="h2" className="text-center">
          Phiên đăng nhập đã hết hạn
        </AppText>
        <AppText variant="body" color="secondary" className="text-center">
          Vì lý do bảo mật, bạn cần đăng nhập lại. Dữ liệu đã lưu trên tài khoản vẫn được giữ
          nguyên.
        </AppText>
        <View className="mt-sm w-full gap-xs">
          <AppButton label="Đăng nhập lại" onPress={handleReLogin} />
          <AppButton label="Đăng xuất" variant="text" onPress={handleLogout} />
        </View>
      </View>

      {variant === 'locked' ? (
        <View className="gap-sm rounded-lg border-[1.5px] border-error bg-surface p-md">
          <View className="flex-row items-center gap-sm">
            <ShieldAlert size={18} color={colors.error} />
            <AppText variant="bodyMedium">Trạng thái khác (mẫu): Tài khoản đang bị khóa</AppText>
          </View>
          <AppText variant="caption" color="secondary">
            Tài khoản tạm thời không thể đăng nhập. Vui lòng liên hệ hỗ trợ để được mở lại.
          </AppText>
          <AppButton label="Liên hệ hỗ trợ" variant="outline" onPress={() => {}} />
        </View>
      ) : null}
    </View>
  );
}
