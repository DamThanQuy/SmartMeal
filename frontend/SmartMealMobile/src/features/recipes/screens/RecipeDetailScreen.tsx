import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  Clock,
  Flame,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  Star,
  UtensilsCrossed,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ErrorState, LoadingState, ScreenContainer } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppIconButton, AppText } from '@/components/ui';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useRecipeDetail } from '../hooks/useRecipes';
import { useFavoritesStore } from '../state/favoritesStore';
import { RECIPE_TAG_OPTIONS } from '../types/recipe.types';

type Props = NativeStackScreenProps<MainStackParamList, 'RecipeDetail'>;

function scaleIngredientAmount(amount: string, factor: number): string {
  const match = amount.match(/^(\d+(?:[.,]\d+)?)(.*)$/);
  if (!match) return amount;
  const value = Number(match[1].replace(',', '.'));
  const scaled = value * factor;
  const rounded = Number.isInteger(scaled) ? scaled : Math.round(scaled * 10) / 10;
  return `${rounded}${match[2]}`;
}

// design/RecipeDetail.dc.html (BR-090, BR-101/102, BR-112, BR-291 — không ghi "an toàn tuyệt
// đối"). "Thêm vào thực đơn" trỏ MealPlanner (Đợt 6 chưa dựng) nên tạm disable.
export function RecipeDetailScreen({ navigation, route }: Props) {
  const { recipeId } = route.params;
  const { colors } = useTheme();
  const { data: recipe, isLoading, isError, error, refetch } = useRecipeDetail(recipeId);
  const isFavorite = useFavoritesStore(state => state.isFavorite(recipeId));
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);
  const [servings, setServings] = useState<number | null>(null);

  const activeServings = servings ?? recipe?.servings ?? 1;
  const factor = recipe ? activeServings / recipe.servings : 1;

  const scaledNutrition = useMemo(() => {
    if (!recipe) return null;
    return {
      calories: Math.round(recipe.nutritionPerServing.calories * factor),
      proteinG: Math.round(recipe.nutritionPerServing.proteinG * factor),
      carbsG: Math.round(recipe.nutritionPerServing.carbsG * factor),
      fatG: Math.round(recipe.nutritionPerServing.fatG * factor),
    };
  }, [recipe, factor]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <LoadingState lines={8} />
      </ScreenContainer>
    );
  }

  if (isError || !recipe || !scaledNutrition) {
    return (
      <ScreenContainer>
        <ErrorState description={error?.message ?? 'Không tìm thấy công thức.'} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  const dietTagLabel = RECIPE_TAG_OPTIONS.find(option => option.id === recipe.tags[0])?.label;

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="relative">
          <View className="h-[300px] items-center justify-center gap-xxs bg-primary-soft">
            <UtensilsCrossed size={44} color={colors.primary} />
            <AppText variant="caption" className="text-on-primary-soft">
              Ảnh món ăn
            </AppText>
          </View>
          <View className="absolute inset-x-md top-[52px] flex-row justify-between">
            <AppIconButton
              accessibilityLabel="Quay lại"
              variant="elevated"
              icon={<ChevronLeft size={22} color={colors.textPrimary} />}
              onPress={() => navigation.goBack()}
            />
            <AppIconButton
              accessibilityLabel={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
              accessibilityState={{ selected: isFavorite }}
              variant="elevated"
              icon={
                <Heart
                  size={22}
                  color={isFavorite ? colors.primary : colors.textSecondary}
                  fill={isFavorite ? colors.primary : 'none'}
                />
              }
              onPress={() => toggleFavorite(recipeId)}
            />
          </View>
        </View>

        <View className="-mt-xl gap-xl rounded-t-sheet bg-background p-lg">
          <View className="gap-sm">
            <AppText variant="h1">{recipe.name}</AppText>
            <View className="flex-row items-center gap-md">
              <View className="flex-row items-center gap-xxs">
                <Star size={16} color={colors.warning} fill={colors.warning} />
                <AppText variant="body" color="secondary">
                  {recipe.rating.toLocaleString('vi-VN')}
                </AppText>
              </View>
              <View className="flex-row items-center gap-xxs">
                <Clock size={16} color={colors.textSecondary} />
                <AppText variant="body" color="secondary">
                  {`${recipe.durationMinutes} phút`}
                </AppText>
              </View>
              <View className="flex-row items-center gap-xxs">
                <Flame size={16} color={colors.textSecondary} />
                <AppText variant="body" color="secondary">
                  {`${recipe.nutritionPerServing.calories} kcal/phần`}
                </AppText>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-xs">
              {dietTagLabel ? <AppBadge label={dietTagLabel} /> : null}
              <AppBadge
                label="Không chứa dị ứng đã khai báo"
                icon={<ShieldCheck size={14} color={colors.onPrimarySoft} />}
              />
            </View>
          </View>

          <AppCard className="gap-sm">
            <View className="flex-row items-center justify-between">
              <AppText variant="h3">Dinh dưỡng / phần</AppText>
              <AppText variant="caption" color="secondary">
                {`Tổng ${scaledNutrition.calories} kcal · ${activeServings} phần`}
              </AppText>
            </View>
            <View className="flex-row gap-xs">
              {[
                { label: 'Calo', value: recipe.nutritionPerServing.calories, unit: '' },
                { label: 'Protein', value: recipe.nutritionPerServing.proteinG, unit: 'g' },
                { label: 'Carbs', value: recipe.nutritionPerServing.carbsG, unit: 'g' },
                { label: 'Fat', value: recipe.nutritionPerServing.fatG, unit: 'g' },
              ].map(item => (
                <View key={item.label} className="flex-1 gap-xxs rounded-md bg-background p-sm">
                  <AppText variant="caption" color="secondary">
                    {item.label}
                  </AppText>
                  <AppText variant="h3">
                    {item.value}
                    <AppText variant="caption" color="secondary">{` ${item.unit}`}</AppText>
                  </AppText>
                </View>
              ))}
            </View>
          </AppCard>

          <View className="gap-xxs">
            <View className="flex-row items-center justify-between pb-xs">
              <AppText variant="h3">Nguyên liệu</AppText>
              <View className="flex-row items-center gap-sm">
                <AppIconButton
                  accessibilityLabel="Giảm khẩu phần"
                  variant="elevated"
                  icon={<Minus size={20} color={colors.textPrimary} />}
                  onPress={() => setServings(Math.max(activeServings - 1, 1))}
                />
                <AppText variant="bodyMedium" className="min-w-[48px] text-center">
                  {`${activeServings} phần`}
                </AppText>
                <AppIconButton
                  accessibilityLabel="Tăng khẩu phần"
                  variant="elevated"
                  icon={<Plus size={20} color={colors.textPrimary} />}
                  onPress={() => setServings(activeServings + 1)}
                />
              </View>
            </View>
            {recipe.ingredients.map(ingredient => (
              <View
                key={ingredient.name}
                className="flex-row justify-between border-t border-border py-sm"
              >
                <AppText variant="bodyLg">{ingredient.name}</AppText>
                <AppText variant="bodyLg" color="secondary">
                  {scaleIngredientAmount(ingredient.amount, factor)}
                </AppText>
              </View>
            ))}
          </View>

          <View className="gap-md">
            <AppText variant="h3">Cách làm</AppText>
            {recipe.steps.map(step => (
              <View key={step.order} className="flex-row gap-sm">
                <View className="h-[28px] w-[28px] items-center justify-center rounded-full bg-primary-soft">
                  <AppText variant="bodyMedium" color="onPrimarySoft">
                    {step.order}
                  </AppText>
                </View>
                <AppText variant="bodyLg" className="flex-1">
                  {step.instruction}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="border-t border-border bg-surface px-md py-md">
        {/* TODO: điều hướng sang MealPlanner khi Đợt 6 dựng xong. */}
        <AppButton label="Thêm vào thực đơn" disabled />
      </View>
    </ScreenContainer>
  );
}
