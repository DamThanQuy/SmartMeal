import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Clock, Plus, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppText } from '@/components/ui';
import {
  MacroStatGrid,
  nutritionPerGram as toNutritionPerGram,
  scaleNutritionByGrams,
  sumNutrition,
  todayIso,
  useAddMealLogEntries,
} from '@/features/nutrition';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { AiResultItemRow } from '../components/AiResultItemRow';
import type { AIRecognizedItem } from '../types/ai.types';

type Props = NativeStackScreenProps<MainStackParamList, 'AISnapResult'>;

// design/AISnap.dc.html (BR-054, BR-061, BR-062, BR-250). Toàn bộ số liệu ở đây là ước tính
// AI — luôn có prefix "≈" và bắt buộc qua Confirm mới lưu vào nhật ký.
export function AISnapResultScreen({ navigation, route }: Props) {
  const { mealType, result } = route.params;
  const { colors } = useTheme();
  const [items, setItems] = useState<AIRecognizedItem[]>(result.items);
  const addMealLogEntries = useAddMealLogEntries(todayIso());
  const mealTitle = MEAL_TYPE_TITLES[mealType];

  const total = sumNutrition(items.map(item => item.nutrition));

  const updateItemGrams = (itemId: string, grams: number) => {
    setItems(current =>
      current.map(item => {
        if (item.id !== itemId) return item;
        const perGram = toNutritionPerGram(item.nutrition, item.grams);
        return { ...item, grams, nutrition: scaleNutritionByGrams(perGram, grams) };
      }),
    );
  };

  const removeItem = (itemId: string) => {
    setItems(current => current.filter(item => item.id !== itemId));
  };

  const handleConfirm = () => {
    addMealLogEntries.mutate(
      {
        mealType,
        entries: items.map(item => ({
          foodName: item.name,
          servingLabel: item.servingLabel,
          grams: item.grams,
          nutrition: item.nutrition,
          source: 'ai',
          aiConfirmed: true,
        })),
      },
      {
        onSuccess: () => {
          navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
            screen: MAIN_TAB_ROUTES.DIARY,
            params: { toast: `Đã ghi ${items.length} món vào ${mealTitle}` },
          });
        },
      },
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Kết quả nhận diện" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-lg py-xs"
      >
        <View>
          <View className="h-[210px] items-center justify-center gap-xxs rounded-lg bg-primary-soft">
            <AppText variant="caption" className="text-on-primary-soft">
              Ảnh bữa ăn của bạn
            </AppText>
          </View>
          <AppBadge
            label="Ước tính từ hình ảnh"
            tone="info"
            icon={<Sparkles size={14} color={colors.infoText} />}
            className="absolute left-sm top-sm bg-surface"
          />
        </View>

        <AppCard className="gap-sm">
          <View className="flex-row items-end justify-between">
            <View>
              <AppText variant="caption" color="secondary">
                {`Tổng ước tính · ${mealTitle}`}
              </AppText>
              <AppText variant="display">{`≈ ${total.calories} kcal`}</AppText>
            </View>
            <AppBadge
              label={mealTitle}
              icon={<Clock size={14} color={colors.onPrimarySoft} />}
            />
          </View>
          <MacroStatGrid
            proteinG={total.proteinG}
            carbsG={total.carbsG}
            fatG={total.fatG}
            estimated
          />
        </AppCard>

        <AppCard className="gap-0">
          <AppText variant="h3" className="pb-sm">
            {`Món nhận diện được (${items.length})`}
          </AppText>
          {items.length === 0 ? (
            <EmptyState title="Chưa còn món nào" description="Bạn đã xóa hết món nhận diện được." />
          ) : (
            items.map(item => (
              <AiResultItemRow
                key={item.id}
                item={item}
                onChangeGrams={grams => updateItemGrams(item.id, grams)}
                onDelete={() => removeItem(item.id)}
              />
            ))
          )}
          <View className="border-t border-border pt-xs">
            {/* TODO: chưa nối luồng thêm món bị AI bỏ sót vào danh sách đang review (Đợt sau). */}
            <View className="min-h-[44px] flex-row items-center gap-xxs opacity-40">
              <AppText variant="bodyMedium" color="onPrimarySoft">
                Thêm món AI bỏ sót
              </AppText>
              <Plus size={16} color={colors.onPrimarySoft} />
            </View>
          </View>
        </AppCard>

        <AppText variant="caption" color="secondary" className="text-center">
          Kết quả AI có thể sai. Hãy kiểm tra trước khi lưu vào nhật ký.
        </AppText>

        {addMealLogEntries.isError ? (
          <AppText variant="caption" color="error" className="text-center">
            {addMealLogEntries.error.message}
          </AppText>
        ) : null}
      </ScrollView>

      <View className="py-md">
        <AppButton
          label="Xác nhận & ghi nhật ký"
          onPress={handleConfirm}
          loading={addMealLogEntries.isPending}
          disabled={items.length === 0}
        />
      </View>
    </ScreenContainer>
  );
}
