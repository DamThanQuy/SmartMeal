import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { LoadingState } from '@/components/common';
import { AppButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { useDeleteMealLogEntry, useMealLogEntry } from '../hooks/useDiary';
import { todayIso } from '../services/nutritionService';

type Props = NativeStackScreenProps<MainStackParamList, 'DeleteConfirm'>;

// design/DeleteConfirm.dc.html (BR-053). presentation:'transparentModal' — dialog giữa màn,
// không phải bottom sheet.
export function DeleteConfirmScreen({ navigation, route }: Props) {
  const { logId } = route.params;
  const { colors } = useTheme();
  const dateIso = todayIso();
  const { data: entry } = useMealLogEntry(dateIso, logId);
  const deleteMealLogEntry = useDeleteMealLogEntry(dateIso);

  const handleDelete = () => {
    deleteMealLogEntry.mutate(logId, {
      onSuccess: () => {
        navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
          screen: MAIN_TAB_ROUTES.DIARY,
          params: { toast: `Đã xóa "${entry?.foodName ?? 'món ăn'}" khỏi nhật ký` },
        });
      },
    });
  };

  return (
    <View className="flex-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đóng"
        className="absolute inset-0 bg-overlay/45"
        onPress={() => navigation.goBack()}
      />
      <View className="mt-[300px] gap-sm rounded-lg bg-surface p-lg mx-xl">
        {!entry ? (
          <LoadingState lines={3} />
        ) : (
          <>
            <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-error-soft">
              <Trash2 size={24} color={colors.error} />
            </View>
            <AppText variant="h3">{`Xóa "${entry.foodName}" khỏi nhật ký?`}</AppText>
            <AppText variant="body" color="secondary">
              {`${MEAL_TYPE_TITLES[entry.mealType]} sẽ giảm ${entry.nutrition.calories} kcal. Thao tác này không thể hoàn tác.`}
            </AppText>
            {deleteMealLogEntry.isError ? (
              <AppText variant="caption" color="error">
                {deleteMealLogEntry.error.message}
              </AppText>
            ) : null}
            <View className="flex-row gap-sm pt-xs">
              <AppButton
                label="Hủy"
                variant="outline"
                onPress={() => navigation.goBack()}
                className="flex-1"
              />
              <AppButton
                label="Xóa"
                onPress={handleDelete}
                loading={deleteMealLogEntry.isPending}
                className="flex-1 bg-error active:bg-error-text"
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}
