import { format, parseISO } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Sparkles, Trash2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppChip, AppIconButton, AppInput, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_OPTIONS, type MealType } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { MacroStatGrid } from '../components/MacroStatGrid';
import { useMealLogEntry, useUpdateMealLogEntry } from '../hooks/useDiary';
import { todayIso } from '../services/nutritionService';
import { scaleNutritionByGrams } from '../utils/nutritionMath';

type Props = NativeStackScreenProps<MainStackParamList, 'EditMealLog'>;

// design/EditMealLog.dc.html (BR-053). Khối lượng luôn tính bằng gram trong data model hiện
// tại — bỏ bớt chip "Đơn vị" (gram/phần/miếng) so với artboard gốc để khớp shape MealLogEntry
// (grams + nutritionPerGram), ghi rõ ở báo cáo Đợt 3.
export function EditMealLogScreen({ navigation, route }: Props) {
  const { logId, dateIso: routeDateIso } = route.params;
  const { colors } = useTheme();
  const dateIso = routeDateIso ?? todayIso();
  const { data: entry, isLoading, isError } = useMealLogEntry(dateIso, logId);
  const updateMealLogEntry = useUpdateMealLogEntry(dateIso);

  const [gramsInput, setGramsInput] = useState('');
  const [mealType, setMealType] = useState<MealType | null>(null);

  const activeMealType = mealType ?? entry?.mealType ?? 'lunch';
  const activeGrams = gramsInput === '' ? (entry?.grams ?? 0) : Number(gramsInput) || 0;

  const previewNutrition = useMemo(() => {
    if (!entry) return null;
    return scaleNutritionByGrams(entry.nutritionPerGram, activeGrams);
  }, [entry, activeGrams]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Sửa món" onBack={() => navigation.goBack()} />
        <LoadingState lines={6} />
      </ScreenContainer>
    );
  }

  if (isError || !entry) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Sửa món" onBack={() => navigation.goBack()} />
        <ErrorState description="Không tìm thấy bản ghi." onRetry={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  // Bản ghi do nơi khác tạo có thể dùng đơn vị khác gram (vd. 'phần').
  const unit = entry.unit ?? 'g';

  const handleSave = () => {
    updateMealLogEntry.mutate(
      { entryId: entry.id, patch: { grams: activeGrams, mealType: activeMealType } },
      {
        onSuccess: () => {
          navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
            screen: MAIN_TAB_ROUTES.DIARY,
            params: { toast: 'Đã lưu thay đổi' },
          });
        },
      },
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Sửa món"
        onBack={() => navigation.goBack()}
        rightContent={
          <AppIconButton
            accessibilityLabel="Xóa món"
            variant="elevated"
            shape="square"
            icon={<Trash2 size={22} color={colors.error} />}
            onPress={() =>
              navigation.navigate(MAIN_STACK_ROUTES.DELETE_CONFIRM, { logId, dateIso })
            }
          />
        }
      />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-lg py-xs">
        <View className="flex-row items-center gap-md">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-card bg-primary-soft" />
          <View className="gap-xxs">
            <AppText variant="h2">{entry.foodName}</AppText>
            {entry.aiConfirmed ? (
              <AppBadge
                label="Từ AI · đã xác nhận"
                icon={<Sparkles size={14} color={colors.onPrimarySoft} />}
              />
            ) : null}
          </View>
        </View>

        <AppCard className="gap-lg">
          <AppInput
            label={unit === 'g' ? 'Khối lượng' : 'Số lượng'}
            keyboardType="number-pad"
            value={gramsInput === '' ? String(entry.grams) : gramsInput}
            onChangeText={setGramsInput}
            rightAdornment={
              <AppText variant="body" color="secondary">
                {unit}
              </AppText>
            }
          />

          <View className="gap-xs">
            <AppText variant="bodyMedium">Bữa</AppText>
            <View className="flex-row flex-wrap gap-xs">
              {MEAL_TYPE_OPTIONS.map(option => (
                <AppChip
                  key={option.id}
                  label={option.label}
                  selected={activeMealType === option.id}
                  onPress={() => setMealType(option.id)}
                />
              ))}
            </View>
          </View>

          {entry.loggedAt ? (
            <AppInput
              label="Thời gian"
              editable={false}
              value={format(parseISO(entry.loggedAt), "HH:mm '·' dd/MM")}
            />
          ) : null}
        </AppCard>

        {previewNutrition ? (
          <AppCard className="gap-sm">
            <View className="flex-row items-baseline justify-between">
              <AppText variant="body" color="secondary">
                Sau khi sửa
              </AppText>
              <AppText variant="body" color="secondary">
                <AppText variant="caption" className="line-through">
                  {`${entry.nutrition.calories}`}
                </AppText>
                {' → '}
                <AppText variant="h2">{`${previewNutrition.calories} kcal`}</AppText>
              </AppText>
            </View>
            <MacroStatGrid
              proteinG={previewNutrition.proteinG}
              carbsG={previewNutrition.carbsG}
              fatG={previewNutrition.fatG}
            />
          </AppCard>
        ) : null}

        {updateMealLogEntry.isError ? (
          <AppText variant="caption" color="error" className="text-center">
            {updateMealLogEntry.error.message}
          </AppText>
        ) : null}
      </ScrollView>

      <View className="flex-row gap-sm py-md">
        <AppButton label="Hủy" variant="outline" onPress={() => navigation.goBack()} />
        <AppButton
          label="Lưu thay đổi"
          onPress={handleSave}
          loading={updateMealLogEntry.isPending}
          disabled={activeGrams <= 0}
          className="flex-1"
        />
      </View>
    </ScreenContainer>
  );
}
