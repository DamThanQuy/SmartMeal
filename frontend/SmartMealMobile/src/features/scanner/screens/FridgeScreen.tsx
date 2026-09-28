import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Pencil, Refrigerator, ShieldCheck, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppText } from '@/components/ui';
import { RecipeCard, useFridgeRecipes } from '@/features/recipes';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useScanFridge } from '../hooks/useScanner';
import { CameraPermissionDeniedError } from '../services/scannerService';
import type { FridgeIngredient } from '../types/scanner.types';

type Props = NativeStackScreenProps<MainStackParamList, 'Fridge'>;

// design/Fridge.dc.html (BR-080). Nguyên liệu phải qua bước xác nhận của user trước khi tính
// vào gợi ý món — không tự lưu (docs/ui-mock-prompts.md Phase 4).
export function FridgeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const scanFridge = useScanFridge();
  const [ingredients, setIngredients] = useState<FridgeIngredient[] | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [hasConfirmedForRecipes, setHasConfirmedForRecipes] = useState(false);

  useEffect(() => {
    scanFridge.mutate(undefined, {
      onSuccess: result => {
        setIngredients(result);
        setConfirmedIds(new Set(result.filter(item => item.status === 'confirmed').map(i => i.id)));
      },
      onError: error => {
        if (error instanceof CameraPermissionDeniedError) {
          navigation.replace(MAIN_STACK_ROUTES.STATE_PERMISSION, { returnTo: 'Fridge' });
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmedNames = (ingredients ?? [])
    .filter(item => confirmedIds.has(item.id))
    .map(item => item.name);

  const { data: matches, isLoading: isLoadingRecipes } = useFridgeRecipes(
    confirmedNames,
    hasConfirmedForRecipes,
  );

  const toggleIngredient = (id: string) => {
    setConfirmedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setHasConfirmedForRecipes(false);
  };

  if (scanFridge.isPending || !ingredients) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Quét tủ lạnh" onBack={() => navigation.goBack()} />
        <LoadingState lines={6} />
      </ScreenContainer>
    );
  }

  if (scanFridge.isError) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Quét tủ lạnh" onBack={() => navigation.goBack()} />
        <ErrorState description={scanFridge.error.message} onRetry={() => scanFridge.mutate(undefined)} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Quét tủ lạnh"
        onBack={() => navigation.goBack()}
        rightContent={<AppBadge label="Pro" icon={<Sparkles size={14} color={colors.onPrimarySoft} />} />}
      />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-lg py-xs">
        <View>
          <View className="h-[170px] items-center justify-center gap-xxs rounded-lg bg-primary-soft">
            <Refrigerator size={40} color={colors.primary} />
            <AppText variant="caption" className="text-on-primary-soft">
              Ảnh tủ lạnh của bạn
            </AppText>
          </View>
          <AppBadge
            label="AI nhận diện · hãy kiểm tra"
            tone="info"
            className="absolute left-sm top-sm bg-surface"
          />
        </View>

        {ingredients.length === 0 ? (
          <EmptyState
            title="Không nhận diện được nguyên liệu"
            description="Thử chụp lại ảnh tủ lạnh rõ hơn."
          />
        ) : (
          <>
            <AppCard className="gap-0">
              <AppText variant="h3" className="pb-sm">
                Nguyên liệu tìm thấy
              </AppText>
              {ingredients.map(item => {
                const isConfirmed = confirmedIds.has(item.id);
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={item.name}
                    accessibilityState={{ checked: isConfirmed }}
                    onPress={() => toggleIngredient(item.id)}
                    className="min-h-[48px] flex-row items-center gap-sm border-t border-border py-sm"
                  >
                    <View
                      className={`h-[24px] w-[24px] items-center justify-center rounded-sm ${
                        isConfirmed ? 'bg-primary' : 'border-2 border-warning'
                      }`}
                    >
                      {isConfirmed ? (
                        <Check size={16} color={colors.onPrimary} strokeWidth={3} />
                      ) : (
                        <AppText variant="caption" className="font-sans-semibold text-warning-text">
                          ?
                        </AppText>
                      )}
                    </View>
                    <View className="flex-1 gap-xxs">
                      <AppText variant="bodyMedium">{item.name}</AppText>
                      <AppText
                        variant="caption"
                        className={item.status === 'uncertain' && !isConfirmed ? 'font-sans-semibold text-warning-text' : undefined}
                        color={item.status === 'uncertain' && !isConfirmed ? undefined : 'secondary'}
                      >
                        {item.status === 'uncertain' && !isConfirmed
                          ? 'Chưa chắc chắn · xác nhận?'
                          : item.quantityLabel}
                      </AppText>
                    </View>
                    <Pencil size={20} color={colors.textSecondary} />
                  </Pressable>
                );
              })}
              <View className="border-t border-border pt-xs">
                {/* TODO: chưa có luồng thêm nguyên liệu thủ công — để đợt sau. */}
                <View className="min-h-[44px] flex-row items-center opacity-40">
                  <AppText variant="bodyMedium" color="onPrimarySoft">
                    Thêm nguyên liệu
                  </AppText>
                </View>
              </View>
            </AppCard>

            <AppButton
              label="Xác nhận & gợi ý món"
              onPress={() => setHasConfirmedForRecipes(true)}
              disabled={confirmedIds.size === 0}
            />

            {hasConfirmedForRecipes ? (
              <View className="gap-sm">
                <AppText variant="h2">Món nấu được</AppText>
                <View className="flex-row items-center gap-xs">
                  <ShieldCheck size={18} color={colors.primary} />
                  <AppText variant="caption" color="secondary">
                    Đã lọc theo dị ứng & chế độ ăn của bạn
                  </AppText>
                </View>
                {isLoadingRecipes ? (
                  <LoadingState lines={4} />
                ) : !matches || matches.length === 0 ? (
                  <EmptyState
                    title="Chưa tìm được món phù hợp"
                    description="Xác nhận thêm nguyên liệu để có nhiều gợi ý hơn."
                  />
                ) : (
                  <View className="flex-row flex-wrap gap-sm">
                    {matches.map(match => (
                      <View key={match.recipe.id} className="w-[47%]">
                        <RecipeCard
                          recipe={match.recipe}
                          showFavorite={false}
                          badgeLabel={`Dùng ${match.matchedCount}/${match.totalIngredients} nguyên liệu`}
                          onPress={() =>
                            navigation.navigate(MAIN_STACK_ROUTES.RECIPE_DETAIL, {
                              recipeId: match.recipe.id,
                            })
                          }
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
