import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Check,
  Pencil,
  Refrigerator,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
  ScreenHeader,
} from '@/components/common';
import {
  AppBadge,
  AppButton,
  AppCard,
  AppIconButton,
  AppText,
} from '@/components/ui';
import { RecipeCard, useFridgeRecipes } from '@/features/recipes';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { AddIngredientRow } from '../components/AddIngredientRow';
import { useScanFridge } from '../hooks/useScanner';
import type { FridgeScanResult } from '../types/scanner.types';

type Props = NativeStackScreenProps<MainStackParamList, 'Fridge'>;

// design/Fridge.dc.html (BR-080→083). Nhận diện từ ảnh thật người dùng vừa chụp (không ảnh mẫu — review
// PR #9 S3). Nguyên liệu AI chờ người dùng kiểm tra/xác nhận trước khi gợi ý món; thêm hoặc sửa tên
// thủ công là thao tác xác nhận của người dùng — không tự lưu (BR-054/BR-082).
export function FridgeScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const scanFridge = useScanFridge();
  const { imageUris } = route.params;
  const [result, setResult] = useState<FridgeScanResult | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [hasConfirmedForRecipes, setHasConfirmedForRecipes] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const manualIngredientSequence = useRef(0);
  const scrollView = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const recipeSectionOffset = useRef(0);
  const shouldRevealRecipes = useRef(false);

  const runScan = () => {
    scanFridge.mutate(imageUris, {
      onSuccess: scanned => {
        setResult(scanned);
        setConfirmedIds(
          new Set(
            scanned.ingredients
              .filter(item => item.status === 'confirmed')
              .map(i => i.id),
          ),
        );
        setHasConfirmedForRecipes(false);
        setEditingId(null);
      },
    });
  };

  useEffect(() => {
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUris]);

  const ingredients = result?.ingredients ?? [];
  const confirmedNames = ingredients
    .filter(item => confirmedIds.has(item.id))
    .map(item => item.name);

  const {
    data: matches,
    isLoading: isLoadingRecipes,
    isFetching: isFetchingRecipes,
    isError: isRecipesError,
    error: recipesError,
    refetch: retryRecipes,
  } = useFridgeRecipes(
    confirmedNames,
    hasConfirmedForRecipes && confirmedNames.length > 0,
  );
  const isFindingRecipes =
    hasConfirmedForRecipes && (isLoadingRecipes || isFetchingRecipes);

  const hasDuplicateName = (name: string, exceptId?: string) =>
    ingredients.some(
      item =>
        item.id !== exceptId &&
        item.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'),
    );

  // Nguyên liệu tự thêm: người dùng tự khai nên tính là đã xác nhận (BR-082).
  const addIngredient = (name: string): string | undefined => {
    if (!result) return undefined;
    if (hasDuplicateName(name)) return 'Nguyên liệu này đã có trong danh sách';
    const id = `manual-${++manualIngredientSequence.current}`;
    setResult(
      current =>
        current && {
          ...current,
          ingredients: [
            ...current.ingredients,
            { id, name, quantityLabel: 'Bạn tự thêm', status: 'confirmed' },
          ],
        },
    );
    setConfirmedIds(current => new Set(current).add(id));
    setHasConfirmedForRecipes(false);
    return undefined;
  };

  const renameIngredient = (id: string, name: string): string | undefined => {
    if (hasDuplicateName(name, id))
      return 'Nguyên liệu này đã có trong danh sách';
    setResult(
      current =>
        current && {
          ...current,
          ingredients: current.ingredients.map(item =>
            item.id === id
              ? {
                  ...item,
                  name,
                  quantityLabel: 'Bạn đã chỉnh sửa',
                  status: 'confirmed',
                }
              : item,
          ),
        },
    );
    setConfirmedIds(current => new Set(current).add(id));
    setHasConfirmedForRecipes(false);
    setEditingId(null);
    return undefined;
  };

  const removeIngredient = (id: string) => {
    setResult(
      current =>
        current && {
          ...current,
          ingredients: current.ingredients.filter(item => item.id !== id),
        },
    );
    setConfirmedIds(current => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    if (editingId === id) setEditingId(null);
    setHasConfirmedForRecipes(false);
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

  const toggleAllIngredients = () => {
    setConfirmedIds(
      confirmedIds.size === ingredients.length
        ? new Set()
        : new Set(ingredients.map(item => item.id)),
    );
    setHasConfirmedForRecipes(false);
  };

  const confirmForRecipes = () => {
    Keyboard.dismiss();
    setEditingId(null);
    shouldRevealRecipes.current = !hasConfirmedForRecipes;
    if (hasConfirmedForRecipes) {
      scrollView.current?.scrollTo({
        y: recipeSectionOffset.current,
        animated: true,
      });
    }
    setHasConfirmedForRecipes(true);
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
        rightContent={
          <AppBadge
            label="Pro"
            icon={<Sparkles size={14} color={colors.onPrimarySoft} />}
          />
        }
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollView}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-lg pt-xs pb-lg"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View>
            {imageUris.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-xs"
              >
                {imageUris.map((uri, index) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    accessibilityLabel={`Ảnh tủ lạnh ${index + 1}`}
                    style={{
                      height: 170,
                      width: imageUris.length === 1 ? 340 : 240,
                      borderRadius: 12,
                    }}
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
                Chế độ demo: máy chủ chưa bật AI nhận diện ảnh, danh sách dưới
                đây là dữ liệu mẫu — đừng dựa vào nó để ra quyết định.
              </AppText>
            </AppCard>
          ) : null}

          <AppCard className="gap-sm">
            <AppText variant="h3">Nguyên liệu tìm thấy</AppText>
            <AppText variant="caption" color="secondary">
              Chọn nguyên liệu bạn đang có. Bạn có thể sửa tên, xóa hoặc tự thêm
              nguyên liệu bên dưới.
            </AppText>
            {ingredients.length === 0 ? (
              <EmptyState
                title="Chưa có nguyên liệu"
                description="Thêm nguyên liệu bạn đang có, hoặc chụp lại ảnh rõ hơn."
              />
            ) : (
              <>
                <AppText variant="caption" color="secondary">
                  {`Đã xác nhận ${confirmedIds.size}/${ingredients.length} nguyên liệu`}
                </AppText>
                <AppButton
                  label={
                    confirmedIds.size === ingredients.length
                      ? 'Bỏ chọn tất cả'
                      : 'Xác nhận tất cả'
                  }
                  variant="outline"
                  onPress={toggleAllIngredients}
                />
                {ingredients.map(item => {
                  const isConfirmed = confirmedIds.has(item.id);
                  return (
                    <View
                      key={item.id}
                      className="gap-xs border-t border-border pt-sm"
                    >
                      <View className="flex-row items-center gap-xs">
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityLabel={item.name}
                          accessibilityHint="Chạm để chọn hoặc bỏ chọn nguyên liệu này"
                          accessibilityState={{ checked: isConfirmed }}
                          onPress={() => toggleIngredient(item.id)}
                          className="min-h-[48px] flex-1 flex-row items-center gap-sm py-xs"
                        >
                          <View
                            className={`h-[24px] w-[24px] items-center justify-center rounded-sm ${
                              isConfirmed
                                ? 'bg-primary'
                                : 'border-2 border-warning'
                            }`}
                          >
                            {isConfirmed ? (
                              <Check
                                size={16}
                                color={colors.onPrimary}
                                strokeWidth={3}
                              />
                            ) : (
                              <AppText
                                variant="caption"
                                className="font-sans-semibold text-warning-text"
                              >
                                ?
                              </AppText>
                            )}
                          </View>
                          <View className="flex-1 gap-xxs">
                            <AppText variant="bodyMedium">{item.name}</AppText>
                            <AppText
                              variant="caption"
                              color="secondary"
                              className={
                                isConfirmed ? undefined : 'text-warning-text'
                              }
                            >
                              {isConfirmed
                                ? item.quantityLabel || 'Đã xác nhận'
                                : 'Chạm để xác nhận'}
                            </AppText>
                          </View>
                        </Pressable>
                        <AppIconButton
                          accessibilityLabel={`Sửa ${item.name}`}
                          icon={
                            <Pencil size={20} color={colors.textSecondary} />
                          }
                          onPress={() => setEditingId(item.id)}
                        />
                        <AppIconButton
                          accessibilityLabel={`Xóa ${item.name}`}
                          icon={
                            <Trash2 size={20} color={colors.textSecondary} />
                          }
                          onPress={() => removeIngredient(item.id)}
                        />
                      </View>
                      {editingId === item.id ? (
                        <AddIngredientRow
                          initialName={item.name}
                          submitLabel="Lưu"
                          inputAccessibilityLabel={`Tên mới cho ${item.name}`}
                          onAdd={name => renameIngredient(item.id, name)}
                          onCancel={() => {
                            Keyboard.dismiss();
                            setEditingId(null);
                          }}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </>
            )}
            <View className="gap-xs border-t border-border pt-sm">
              <AppText variant="bodyMedium">Thêm nguyên liệu</AppText>
              <AddIngredientRow onAdd={addIngredient} />
            </View>
          </AppCard>

          {ingredients.length > 0 ? (
            <View className="gap-xs">
              {editingId !== null || confirmedIds.size === 0 ? (
                <AppText variant="caption" color="secondary">
                  {editingId !== null
                    ? 'Lưu hoặc hủy chỉnh sửa trước khi gợi ý món.'
                    : 'Chọn ít nhất một nguyên liệu ở trên để gợi ý món.'}
                </AppText>
              ) : null}
              <AppButton
                label="Xác nhận & gợi ý món"
                onPress={confirmForRecipes}
                loading={isFindingRecipes}
                disabled={confirmedIds.size === 0 || editingId !== null}
              />
            </View>
          ) : null}

          {hasConfirmedForRecipes ? (
            <View
              className="gap-sm"
              onLayout={event => {
                recipeSectionOffset.current = event.nativeEvent.layout.y;
                if (shouldRevealRecipes.current) {
                  shouldRevealRecipes.current = false;
                  scrollView.current?.scrollTo({
                    y: recipeSectionOffset.current,
                    animated: true,
                  });
                }
              }}
            >
              <AppText variant="h2">Món nấu được</AppText>
              <View className="flex-row items-center gap-xs">
                <ShieldCheck size={18} color={colors.primary} />
                <AppText variant="caption" color="secondary">
                  Đã lọc theo dị ứng & chế độ ăn của bạn
                </AppText>
              </View>
              {isFindingRecipes ? (
                <LoadingState lines={4} />
              ) : isRecipesError ? (
                <ErrorState
                  title="Chưa tải được gợi ý món"
                  description={recipesError?.message}
                  onRetry={() => void retryRecipes()}
                />
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
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
