import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EyeOff, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppCheckbox, AppText } from '@/components/ui';
import type { MainStackParamList } from '@/navigation/types';
import { useDeleteMyData } from '@/features/auth';
import { useAuthStore } from '@/state/auth/authStore';
import { resetUserData } from '@/state/resetUserData';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'DeleteData'>;

const ITEMS_TO_DELETE = [
  'Nhật ký ăn uống và biểu đồ',
  'Hồ sơ sức khỏe, cân nặng',
  'Thực đơn và danh sách đi chợ',
  'Yêu thích và bộ sưu tập',
  'Tiến độ Bé Mầm, huy hiệu',
];

const ITEMS_TO_KEEP = ['Lịch sử giao dịch thanh toán'];

const ITEMS_TO_ANONYMIZE = ['Số liệu thống kê tổng hợp, không gắn với tên bạn'];

// design/DeleteData.dc.html (design v2, Đợt 9, BR-271). "Xóa dữ liệu" gọi DELETE /me/data để xóa dữ
// liệu trên máy chủ, rồi resetUserData() (xóa nhật ký, hồ sơ sức khỏe, yêu thích/bộ sưu tập, meal
// plan, grocery, gamification, AI usage cục bộ — mỗi store tự đăng ký hàm reset, xem
// src/state/resetUserData.ts) và logout() để quay về Welcome. Máy chủ lỗi thì KHÔNG xóa cục bộ và
// KHÔNG đăng xuất, để người dùng thử lại (không để lại dữ liệu trên máy chủ mà tưởng đã xóa).
// KHÔNG reset authStore/appStore (theme, ngôn ngữ) và premiumStore/lịch sử giao dịch — dữ liệu
// thanh toán được giữ lại đúng BR-271 (xem ITEMS_TO_KEEP ở trên).
export function DeleteDataScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const logout = useAuthStore(state => state.logout);
  const [confirmed, setConfirmed] = useState(true);
  const deleteMyData = useDeleteMyData();

  const handleDelete = () => {
    deleteMyData.mutate(undefined, {
      onSuccess: () => {
        resetUserData();
        logout();
      },
    });
  };

  return (
    <ScreenContainer scroll>
      <ScreenHeader title="Xóa dữ liệu cá nhân" onBack={() => navigation.goBack()} />
      <View className="gap-lg py-sm">
        <AppText variant="bodyLg" color="secondary">
          Trước khi xóa, hãy xem dữ liệu nào sẽ mất, dữ liệu nào được giữ và dữ liệu nào được ẩn
          danh.
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
            <AppText variant="h3">Được giữ lại theo yêu cầu hệ thống</AppText>
            <AppBadge
              label="Giữ"
              tone="primary"
              icon={<ShieldCheck size={14} color={colors.onPrimarySoft} />}
            />
          </View>
          {ITEMS_TO_KEEP.map(item => (
            <View key={item} className="flex-row items-center gap-sm border-t border-border py-sm">
              <ShieldCheck size={16} color={colors.textSecondary} />
              <AppText variant="body">{item}</AppText>
            </View>
          ))}
        </AppCard>

        <AppCard className="gap-xxs">
          <View className="flex-row items-center justify-between pb-xxs">
            <AppText variant="h3">Được ẩn danh</AppText>
            <AppBadge
              label="Ẩn danh"
              tone="info"
              icon={<EyeOff size={14} color={colors.infoText} />}
            />
          </View>
          {ITEMS_TO_ANONYMIZE.map(item => (
            <View key={item} className="flex-row items-center gap-sm border-t border-border py-sm">
              <EyeOff size={16} color={colors.textSecondary} />
              <AppText variant="body">{item}</AppText>
            </View>
          ))}
        </AppCard>

        <AppCheckbox
          checked={confirmed}
          onChange={setConfirmed}
          label="Tôi hiểu thao tác này không thể hoàn tác và cần đăng nhập lại để dùng tiếp."
        />

        <View className="flex-row gap-sm">
          <AppButton
            label="Giữ lại"
            variant="outline"
            className="flex-1"
            onPress={() => navigation.goBack()}
          />
          <AppButton
            label="Xóa dữ liệu"
            disabled={!confirmed}
            loading={deleteMyData.isPending}
            className="flex-1 bg-error active:bg-error-text"
            onPress={handleDelete}
          />
        </View>
        {deleteMyData.isError ? (
          <AppText variant="caption" color="error" className="text-center">
            {deleteMyData.error.message}
          </AppText>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
