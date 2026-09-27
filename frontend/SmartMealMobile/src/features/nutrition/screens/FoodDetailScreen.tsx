import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertTriangle, Heart, Minus, Plus, ShieldCheck } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppChip, AppIconButton, AppInput, AppText } from '@/components/ui';
import { ALLERGY_OPTIONS } from '@/features/health';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_OPTIONS, MEAL_TYPE_TITLES, type MealType } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { useAddMealLogEntries } from '../hooks/useDiary';
import { useFoodDetail } from '../hooks/useFoodSearch';
import { CURRENT_USER_ALLERGY_IDS } from '../mocks/currentUserAllergies.mock';
import { todayIso } from '../services/nutritionService';
import { MacroStatGrid } from '../components/MacroStatGrid';
import { nutritionPerGram, scaleNutritionByGrams } from '../utils/nutritionMath';

type Props = NativeStackScreenProps<MainStackParamList, 'FoodDetail'>;

const CUSTOM_SERVING_ID = 'custom';
const SODIUM_WARNING_THRESHOLD_MG = 1200;

// design/FoodDetail.dc.html (BR-052, BR-053, BR-090, BR-101/102). Dinh dưỡng tính lại theo
// gram tuyến tính từ nutritionPerServing gốc — dùng chung nutritionMath với AI/EditMealLog.
export function FoodDetailScreen({ navigation, route }: Props) {
  const { foodId, mealType: initialMealType } = route.params;
  const { colors } = useTheme();
  const { data: food, isLoading, isError, error, refetch } = useFoodDetail(foodId);
  const addMealLogEntries = useAddMealLogEntries(todayIso());

  const [servingId, setServingId] = useState<string>('');
  const [customGrams, setCustomGrams] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [mealType, setMealType] = useState<MealType>(initialMealType);

  const activeServingId = servingId || food?.defaultServingId || '';

  const perGramBase = useMemo(() => {
    if (!food) return null;
    const defaultServing = food.servingOptions.find(
      option => option.id === food.defaultServingId,
    );
    if (!defaultServing) return null;
    return nutritionPerGram(food.nutritionPerServing, defaultServing.grams);
  }, [food]);

  const servingGrams =
    activeServingId === CUSTOM_SERVING_ID
      ? Number(customGrams) || 0
      : (food?.servingOptions.find(option => option.id === activeServingId)?.grams ?? 0);

  const totalGrams = servingGrams * quantity;
  const nutrition =
    perGramBase && totalGrams > 0
      ? scaleNutritionByGrams(perGramBase, totalGrams)
      : { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0, sodiumMg: 0, fiberG: 0 };

  const matchedAllergenIds = (food?.allergenIds ?? []).filter(id =>
    CURRENT_USER_ALLERGY_IDS.includes(id),
  );
  const matchedAllergenLabels = matchedAllergenIds
    .map(id => ALLERGY_OPTIONS.find(option => option.id === id)?.label ?? id)
    .join(', ');

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Chi tiết món" onBack={() => navigation.goBack()} />
        <LoadingState lines={6} />
      </ScreenContainer>
    );
  }

  if (isError || !food) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Chi tiết món" onBack={() => navigation.goBack()} />
        <ErrorState description={error?.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  const servingLabel =
    activeServingId === CUSTOM_SERVING_ID
      ? `${servingGrams} g`
      : (food.servingOptions.find(option => option.id === activeServingId)?.label ?? '');
  const finalServingLabel = quantity > 1 ? `${quantity} × ${servingLabel}` : servingLabel;

  const handleAdd = () => {
    if (totalGrams <= 0) return;
    addMealLogEntries.mutate(
      {
        mealType,
        entries: [
          {
            foodName: food.name,
            servingLabel: finalServingLabel,
            grams: totalGrams,
            nutrition,
            source: 'database',
          },
        ],
      },
      {
        onSuccess: () => {
          navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
            screen: MAIN_TAB_ROUTES.DIARY,
            params: { toast: `Đã ghi 1 món vào ${MEAL_TYPE_TITLES[mealType]}` },
          });
        },
      },
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Chi tiết món"
        onBack={() => navigation.goBack()}
        rightContent={
          <AppIconButton
            accessibilityLabel="Yêu thích"
            variant="elevated"
            shape="square"
            icon={<Heart size={22} color={colors.textPrimary} />}
            disabled
          />
        }
      />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-lg py-xs">
        <View className="flex-row items-center gap-md">
          <View className="h-[80px] w-[80px] items-center justify-center rounded-card bg-primary-soft" />
          <View className="gap-xxs">
            <AppText variant="h2">{food.name}</AppText>
            {food.verified ? (
              <AppBadge
                label="Dữ liệu đã xác minh"
                icon={<ShieldCheck size={14} color={colors.onPrimarySoft} />}
              />
            ) : null}
          </View>
        </View>

        <AppCard className="gap-md">
          <AppText variant="bodyMedium">Khẩu phần</AppText>
          <View className="flex-row flex-wrap gap-xs">
            {food.servingOptions.map(option => (
              <AppChip
                key={option.id}
                label={option.label}
                selected={activeServingId === option.id}
                onPress={() => setServingId(option.id)}
              />
            ))}
            <AppChip
              label="Tùy chỉnh"
              selected={activeServingId === CUSTOM_SERVING_ID}
              onPress={() => setServingId(CUSTOM_SERVING_ID)}
            />
          </View>
          {activeServingId === CUSTOM_SERVING_ID ? (
            <AppInput
              placeholder="0"
              keyboardType="number-pad"
              value={customGrams}
              onChangeText={setCustomGrams}
              rightAdornment={
                <AppText variant="body" color="secondary">
                  g
                </AppText>
              }
            />
          ) : null}

          <View className="flex-row items-center justify-between">
            <AppText variant="body" color="secondary">
              Số lượng
            </AppText>
            <View className="flex-row items-center gap-sm">
              <AppIconButton
                accessibilityLabel="Giảm"
                icon={<Minus size={22} color={colors.textPrimary} />}
                onPress={() => setQuantity(current => Math.max(current - 1, 1))}
              />
              <AppText variant="h3" className="min-w-[40px] text-center">
                {quantity}
              </AppText>
              <AppIconButton
                accessibilityLabel="Tăng"
                icon={<Plus size={22} color={colors.textPrimary} />}
                onPress={() => setQuantity(current => current + 1)}
              />
            </View>
          </View>

          <AppText variant="bodyMedium">Bữa</AppText>
          <View className="flex-row flex-wrap gap-xs">
            {MEAL_TYPE_OPTIONS.map(option => (
              <AppChip
                key={option.id}
                label={option.label}
                selected={mealType === option.id}
                onPress={() => setMealType(option.id)}
              />
            ))}
          </View>
        </AppCard>

        <AppCard className="gap-sm">
          <View className="flex-row items-baseline justify-between">
            <AppText variant="h3">Dinh dưỡng</AppText>
            <AppText variant="h2" color="onPrimarySoft">{`${nutrition.calories} kcal`}</AppText>
          </View>
          <MacroStatGrid proteinG={nutrition.proteinG} carbsG={nutrition.carbsG} fatG={nutrition.fatG} />
          <View className="gap-xs border-t border-border pt-sm">
            <View className="flex-row justify-between">
              <AppText variant="body" color="secondary">
                Đường
              </AppText>
              <AppText variant="body">{`${nutrition.sugarG ?? 0} g`}</AppText>
            </View>
            <View className="flex-row justify-between">
              <AppText variant="body" color="secondary">
                Natri
              </AppText>
              <AppText variant="body">{`${nutrition.sodiumMg ?? 0} mg`}</AppText>
            </View>
            <View className="flex-row justify-between">
              <AppText variant="body" color="secondary">
                Chất xơ
              </AppText>
              <AppText variant="body">{`${nutrition.fiberG ?? 0} g`}</AppText>
            </View>
          </View>
        </AppCard>

        {(nutrition.sodiumMg ?? 0) > SODIUM_WARNING_THRESHOLD_MG ? (
          <View className="flex-row items-center gap-sm rounded-card border border-warning p-md">
            <AlertTriangle size={20} color={colors.warning} />
            <AppText variant="body" className="flex-1">
              Natri khá cao so với khuyến nghị trong ngày
            </AppText>
          </View>
        ) : null}

        {matchedAllergenIds.length > 0 ? (
          <View className="flex-row items-center gap-sm rounded-card border border-error p-md">
            <AlertTriangle size={20} color={colors.error} />
            <AppText variant="body" className="flex-1">
              {`Có thể chứa ${matchedAllergenLabels} — trùng danh sách dị ứng bạn đã khai báo`}
            </AppText>
          </View>
        ) : (
          <View className="flex-row items-center gap-sm">
            <ShieldCheck size={20} color={colors.primary} />
            <AppText variant="body" color="secondary">
              Không chứa dị ứng bạn đã khai báo
            </AppText>
          </View>
        )}

        {addMealLogEntries.isError ? (
          <AppText variant="caption" color="error" className="text-center">
            {addMealLogEntries.error.message}
          </AppText>
        ) : null}
      </ScrollView>

      <View className="py-md">
        <AppButton
          label={`Thêm vào ${MEAL_TYPE_TITLES[mealType]} · ${nutrition.calories} kcal`}
          onPress={handleAdd}
          loading={addMealLogEntries.isPending}
          disabled={totalGrams <= 0}
        />
      </View>
    </ScreenContainer>
  );
}
