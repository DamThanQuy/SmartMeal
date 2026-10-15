import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Pencil, Refrigerator, ShieldCheck, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppText } from '@/components/ui';
import { RecipeCard, useFridgeRecipes } from '@/features/recipes';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { AddIngredientRow } from '../components/AddIngredientRow';
import { useScanFridge } from '../hooks/useScanner';
import { CameraPermissionDeniedError } from '../services/scannerService';
import type { FridgeScanResult } from '../types/scanner.types';

type Props = NativeStackScreenProps<MainStackParamList, 'Fridge'>;

// design/Fridge.dc.html (BR-080→083). Nhận diện từ ảnh thật người dùng vừa chụp (không ảnh mẫu — review
// PR #9 S3). Mọi nguyên liệu AI trả về đều "chưa chắc chắn": user phải tự tick xác nhận trước khi tính
// vào gợi ý món — không tự lưu (BR-054/BR-082).
export function FridgeScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const scanFridge = useScanFridge();
  const { imageUris } = route.params;
  const [result, setResult] = useState<FridgeScanResult | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [hasConfirmedForRecipes, setHasConfirmedForRecipes] = useState(false);

  const runScan = () => {
    scanFridge.mutate(imageUris, {
      onSuccess: scanned => {
        setResult(scanned);
        setConfirmedIds(new Set(scanned.ingredients.filter(item => item.status === 'confirmed').map(i => i.id)));
        setHasConfirmedForRecipes(false);
      },
      onError: error => {
        if (error instanceof CameraPermissionDeniedError) {
          navigation.replace(MAIN_STACK_ROUTES.STATE_PERMISSION, { returnTo: 'Fridge' });
        }
      },
    });
  };

  useEffect(() => {
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUris]);

  const ingredients = result?.ingredients ?? [];
  const confirmedNames = ingredients.filter(item => confirmedIds.has(item.id)).map(item => item.name);

  const { data: matches, isLoading: isLoadingRecipes } = useFridgeRecipes(
    confirmedNames,
    hasConfirmedForRecipes,
  );

  // Nguyên liệu tự thêm: người dùng tự khai nên tính là đã xác nhận (BR-082).
  const addIngredient = (name: string): string | undefined => {
    if (!result) return undefined;
    const exists = result.ingredients.some(item => item.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'));
    if (exists) return 'Nguyên liệu này đã có trong danh sách';
    const id = `manual-${Date.now()}`;
    setResult({ ...result, ingredients: [...result.ingredients, { id, name, quantityLabel: 'Bạn tự thêm', status: 'confirmed' }] });
    setConfirmedIds(current => new Set(current).add(id));
    setHasConfirmedForRecipes(false);
    return undefined;
  };

  const toggleIngredient = (id: string) => {
    setConfirmedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setHasConfirmedForRecipes(false);
  };

  // Lỗi kiểm tra trước loading: mutation lỗi thì `result` vẫn null (review PR #9 — kẹt skeleton).
  if (scanFridge.isError) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Quét tủ lạnh" onBack={() => navigation.goBack()} />
        <ErrorState description={scanFridge.error.message} onRetry={runScan} />
        <AppButton
          label="Chụp lại"
          variant="outline"
          onPress={() => navigation.replace(MAIN_STACK_ROUTES.FRIDGE_CAMERA)}
        />
      </ScreenContainer>
    );
  }

  if (scanFridge.isPending || !result) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Quét tủ lạnh" onBack={() => navigation.goBack()} />
        <LoadingState lines={6} />
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
          {imageUris.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-xs">
              {imageUris.map((uri, index) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  accessibilityLabel={`Ảnh tủ lạnh ${index + 1}`}
                  style={{ height: 170, width: imageUris.length === 1 ? 340 : 240, borderRadius: 12 }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View className="h-[170px] items-center justify-center gap-xxs rounded-lg bg-primary-soft">
              <Refrigerator size={40} color={colors.primary} />
              <AppText variant="caption" className="text-on-primary-soft">
                Ảnh tủ lạnh của bạn
              </AppText>
            </View>
          )}
          <AppBadge
            label="AI nhận diện · hãy kiểm tra"
            tone="info"
            className="absolute left-sm top-sm bg-surface"
          />
        </View>

        {result.isDemo ? (
          <AppCard className="border border-warning">
            <AppText variant="caption" className="text-warning-text">
              Chế độ demo: máy chủ chưa bật AI nhận diện ảnh, danh sách dưới đây là dữ liệu mẫu — đừng dựa vào
              nó để ra quyết định.
            </AppText>
          </AppCard>
        ) : null}

        {ingredients.length === 0 ? (
          <View className="gap-md">
            <EmptyState
              title="Không nhận diện được nguyên liệu"
              description="Thử chụp lại ảnh rõ hơn, hoặc tự thêm nguyên liệu bạn đang có."
            />
            <AddIngredientRow onAdd={addIngredient} />
          </View>
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
              <View className="border-t border-border pt-sm">
                <AddIngredientRow onAdd={addIngredient} />
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
