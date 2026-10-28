import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShieldCheck, Trash2, TriangleAlert } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppCheckbox, AppInput, AppText } from '@/components/ui';
import { useDeleteAccount } from '@/features/auth';
import { useOfflineSyncStore } from '@/features/nutrition';
import type { MainStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/state/auth/authStore';
import { resetUserData } from '@/state/resetUserData';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'DeleteAccount'>;

const ITEMS_TO_DELETE = [
  'Tài khoản và mọi phiên đăng nhập',
  'Hồ sơ sức khỏe, lịch sử cân nặng',
  'Nhật ký ăn uống, nước uống',
  'Thực đơn, danh sách đi chợ',
  'Yêu thích, bộ sưu tập và liên kết chia sẻ',
  'Bé Mầm, thử thách, huy hiệu, thông báo',
  'Ảnh đại diện',
];

// Xóa vĩnh viễn tài khoản (BR-271, DELETE /auth/account) — khác "Xóa dữ liệu cá nhân" (giữ tài khoản). Dựng
// cùng bố cục DeleteDataScreen (design/DeleteData.dc.html). Xác nhận bằng mật khẩu; tài khoản không có mật khẩu
// (tạo bằng đăng nhập Google trước đây) thì nhập lại email. Lịch sử thanh toán được giữ ẩn danh để đối soát.
export function DeleteAccountScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const deleteAccount = useDeleteAccount();
  const [confirmed, setConfirmed] = useState(false);
  const [secret, setSecret] = useState('');

  const usesPassword = user?.hasPassword !== false;
  const canSubmit = confirmed && secret.trim().length > 0;

  const handleDelete = () => {
    deleteAccount.mutate(usesPassword ? { password: secret } : { confirmEmail: secret.trim() }, {
      onSuccess: async () => {
        // Dữ liệu cục bộ của tài khoản (kể cả hàng đợi offline đã lưu) không còn chủ — xóa hết rồi về màn chào.
        await useOfflineSyncStore.getState().discardAll();
        resetUserData();
        logout();
      },
    });
  };

  return (
    <ScreenContainer scroll>
      <ScreenHeader title="Xóa tài khoản" onBack={() => navigation.goBack()} />
      <View className="gap-lg py-sm">
        <AppText variant="bodyLg" color="secondary">
          {'Tài khoản sẽ bị xóa vĩnh viễn cùng toàn bộ dữ liệu. Nếu chỉ muốn làm lại từ đầu, hãy dùng "Xóa dữ liệu cá nhân" để giữ tài khoản.'}
        </AppText>

        <AppCard className="gap-xxs">
          <View className="flex-row items-center justify-between pb-xxs">
            <AppText variant="h3">Sẽ bị xóa</AppText>
            <AppBadge
              label="Không hoàn tác"
              tone="warning"
              icon={<TriangleAlert size={14} color={colors.warningText} />}
            />
          </View>
          {ITEMS_TO_DELETE.map(item => (
            <View key={item} className="flex-row items-center gap-sm border-t border-border py-sm">
              <Trash2 size={16} color={colors.textSecondary} />
              <AppText variant="body">{item}</AppText>
            </View>
          ))}
        </AppCard>

        <AppCard className="gap-xxs">
          <View className="flex-row items-center justify-between pb-xxs">
            <AppText variant="h3">Được giữ ẩn danh</AppText>
            <AppBadge label="Giữ" tone="primary" icon={<ShieldCheck size={14} color={colors.onPrimarySoft} />} />
          </View>
          <View className="flex-row items-center gap-sm border-t border-border py-sm">
            <ShieldCheck size={16} color={colors.textSecondary} />
            <AppText variant="body" className="flex-1">
              Lịch sử giao dịch thanh toán (không còn gắn với tên hay email của bạn)
            </AppText>
          </View>
        </AppCard>

        {usesPassword ? (
          <AppInput
            label="Mật khẩu hiện tại"
            placeholder="Nhập mật khẩu để xác nhận"
            secureTextEntry
            autoCapitalize="none"
            value={secret}
            onChangeText={setSecret}
          />
        ) : (
          <AppInput
            label="Email của tài khoản"
            placeholder={user?.email ?? 'email@example.com'}
            keyboardType="email-address"
            autoCapitalize="none"
            value={secret}
            onChangeText={setSecret}
          />
        )}

        <AppCheckbox
          checked={confirmed}
          onChange={setConfirmed}
          label="Tôi hiểu tài khoản và dữ liệu sẽ bị xóa vĩnh viễn, không khôi phục được."
        />

        <View className="flex-row gap-sm">
          <AppButton label="Giữ tài khoản" variant="outline" className="flex-1" onPress={() => navigation.goBack()} />
          <AppButton
            label="Xóa tài khoản"
            disabled={!canSubmit}
            loading={deleteAccount.isPending}
            className="flex-1 bg-error active:bg-error-text"
            onPress={handleDelete}
          />
        </View>
        {deleteAccount.isError ? (
          <AppText variant="caption" color="error" className="text-center" accessibilityRole="alert">
            {deleteAccount.error.message}
          </AppText>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
