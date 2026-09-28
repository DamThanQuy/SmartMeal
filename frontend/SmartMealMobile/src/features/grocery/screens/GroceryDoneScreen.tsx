import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { addDays, format } from 'date-fns';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingState } from '@/components/common';
import { AppButton, AppIconButton, AppInput, AppText } from '@/components/ui';
import type { MainStackParamList } from '@/navigation/types';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';
import { useCarryOverPendingItems, useGroceryList, useMarkAllGroceryPurchased } from '../hooks/useGrocery';

type Props = NativeStackScreenProps<MainStackParamList, 'GroceryDone'>;

type CompletionChoice = 'keep' | 'markAll';

interface CompletionOptionProps {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

function CompletionOption({ title, description, selected, onPress }: CompletionOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-[64px] flex-row items-center gap-md rounded-card border p-md ${
        selected ? 'border-2 border-primary bg-primary-soft' : 'border-border bg-surface'
      }`}
    >
      <View className="flex-1 gap-xxs">
        <AppText variant="bodyMedium">{title}</AppText>
        <AppText variant="caption" color="secondary">
          {description}
        </AppText>
      </View>
      <View
        className={`h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
          selected ? 'border-primary' : 'border-border'
        }`}
      >
        {selected ? <View className="h-[12px] w-[12px] rounded-full bg-primary" /> : null}
      </View>
    </Pressable>
  );
}

// design/GroceryDone.dc.html (BR-171, BR-173, BR-174, BR-271). Bottom sheet mở từ GroceryScreen
// "Hoàn tất mua sắm". "Giữ lại N món chưa mua" (mặc định) cộng dồn các món Pending sang danh sách
// tuần sau (`carryOverPendingItems`, dùng đúng logic gộp BR-171) — không âm thầm làm mất dữ liệu
// user. "Đánh dấu tất cả đã mua" kết thúc danh sách tuần này, không carry-over.
export function GroceryDoneScreen({ navigation, route }: Props) {
  const { weekStartIso } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { data } = useGroceryList(weekStartIso);
  const markAllPurchased = useMarkAllGroceryPurchased(weekStartIso);
  const carryOverPendingItems = useCarryOverPendingItems(weekStartIso);
  const [choice, setChoice] = useState<CompletionChoice>('keep');
  const [actualCost, setActualCost] = useState('');

  const pendingCount = data ? data.totalItems - data.purchasedItems : 0;
  const weekEndLabel = format(addDays(new Date(weekStartIso), 6), 'dd/MM');
  const weekStartLabel = format(new Date(weekStartIso), 'dd/MM');
  const isPending = markAllPurchased.isPending || carryOverPendingItems.isPending;
  const errorMessage = markAllPurchased.error?.message ?? carryOverPendingItems.error?.message;

  const handleComplete = () => {
    if (choice === 'markAll') {
      markAllPurchased.mutate(undefined, { onSuccess: () => navigation.goBack() });
      return;
    }
    carryOverPendingItems.mutate(undefined, { onSuccess: () => navigation.goBack() });
  };

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
        <View className="flex-row items-center justify-between">
          <AppText variant="h2">Hoàn tất mua sắm?</AppText>
          <AppIconButton
            accessibilityLabel="Đóng"
            icon={<X size={22} color={colors.textPrimary} />}
            onPress={() => navigation.goBack()}
          />
        </View>

        {!data ? (
          <LoadingState lines={3} />
        ) : (
          <>
            <AppText variant="body" color="secondary">
              {`Bạn đã mua ${data.purchasedItems}/${data.totalItems} món. Còn ${pendingCount} món chưa mua trong danh sách tuần ${weekStartLabel}–${weekEndLabel}.`}
            </AppText>

            <View className="gap-sm">
              <CompletionOption
                title={`Giữ lại ${pendingCount} món chưa mua`}
                description="Chuyển sang danh sách tuần sau"
                selected={choice === 'keep'}
                onPress={() => setChoice('keep')}
              />
              <CompletionOption
                title="Đánh dấu tất cả đã mua"
                description="Kết thúc danh sách tuần này"
                selected={choice === 'markAll'}
                onPress={() => setChoice('markAll')}
              />
            </View>

            <AppInput
              label="Chi phí thực tế (không bắt buộc)"
              placeholder="0"
              keyboardType="decimal-pad"
              value={actualCost}
              onChangeText={setActualCost}
              rightAdornment={
                <AppText variant="body" color="secondary">
                  đ
                </AppText>
              }
            />
            <AppText variant="caption" color="secondary">
              {`Ước tính từ bảng giá trung bình: ${data.estimatedTotalCostVnd.toLocaleString('vi-VN')}đ`}
            </AppText>

            {errorMessage ? (
              <AppText variant="caption" color="error">
                {errorMessage}
              </AppText>
            ) : null}

            <View className="flex-row gap-sm">
              <AppButton label="Hủy" variant="outline" onPress={() => navigation.goBack()} className="flex-shrink" />
              <AppButton
                label="Hoàn tất"
                onPress={handleComplete}
                loading={isPending}
                className="flex-1"
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}
