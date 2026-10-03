import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bookmark, Refrigerator, Search, SlidersHorizontal } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer } from '@/components/common';
import { AppChip, AppIconButton, AppInput, AppText } from '@/components/ui';
import { ALLERGY_OPTIONS } from '@/features/health';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList, MainTabParamList } from '@/navigation/types';
import { useAuthStore } from '@/state/auth/authStore';
import { useIsPro } from '@/state/premium/premiumStore';
import { useTheme } from '@/theme/ThemeProvider';
import { RecipeCard } from '../components/RecipeCard';
import { useRecommendedRecipes } from '../hooks/useRecipes';
import { useFavoriteRecipes, useToggleFavorite } from '../hooks/useFavorites';
import { RECIPE_TAG_OPTIONS, type RecipeFilters, type RecipeTag } from '../types/recipe.types';

type Props = BottomTabScreenProps<MainTabParamList, 'Discover'>;

// design/Discovery.dc.html (BR-090→100). Tab "Khám phá". Điều hướng sang MainStackParamList
// (FilterSheet/RecipeDetail/Fridge/Favorites) qua useNavigation vì các màn này nằm ngoài Tab.
export function DiscoveryScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<RecipeTag | undefined>(route.params?.filters?.tag);
  const isGuest = useAuthStore(state => state.isGuest);
  const isPremium = useIsPro();
  const favoritesQuery = useFavoriteRecipes(!isGuest);
  const toggleFavorite = useToggleFavorite();

  // BR-080, BR-230/231 — Fridge Scanner chỉ Pro; Free bấm vào mở màn Premium thay vì camera.
  const openFridgeScanner = () =>
    isPremium
      ? navigation.navigate(MAIN_STACK_ROUTES.FRIDGE_CAMERA)
      : navigation.navigate(MAIN_STACK_ROUTES.PREMIUM);

  // BR §2.1 — Guest chỉ xem, "yêu thích"/"đã lưu" cần tài khoản → mở GuestPromptScreen (Đợt 9).
  const openFavorites = () =>
    isGuest
      ? navigation.navigate(MAIN_STACK_ROUTES.GUEST_PROMPT)
      : navigation.navigate(MAIN_STACK_ROUTES.FAVORITES);
  const handleToggleFavorite = (recipeId: string) =>
    isGuest
      ? navigation.navigate(MAIN_STACK_ROUTES.GUEST_PROMPT)
      : toggleFavorite.mutate(recipeId);

  // FilterSheet quay lại đây qua route.params.filters (Discover là tab, không remount) — đồng
  // bộ activeTag ngay trong render (React khuyến nghị cách này thay vì effect — xem
  // DiaryScreen.tsx cho cùng pattern với route.params.toast).
  const [lastSyncedFilters, setLastSyncedFilters] = useState<RecipeFilters | undefined>(
    route.params?.filters,
  );
  if (route.params?.filters !== lastSyncedFilters) {
    setLastSyncedFilters(route.params?.filters);
    setActiveTag(route.params?.filters?.tag);
  }

  const filters = { ...route.params?.filters, tag: activeTag };
  const { data, isLoading, isError, error, refetch } = useRecommendedRecipes(filters);

  const visibleRecipes = useMemo(() => {
    const recipes = data?.recipes ?? [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return recipes;
    return recipes.filter(
      recipe =>
        recipe.name.toLowerCase().includes(query) ||
        recipe.ingredients.some(ingredient => ingredient.name.toLowerCase().includes(query)),
    );
  }, [data, searchQuery]);

  const excludedAllergenLabels = (data?.excludedAllergenIds ?? [])
    .map(id => ALLERGY_OPTIONS.find(option => option.id === id)?.label ?? id)
    .join(', ');

  return (
    <ScreenContainer scroll>
      <View className="gap-md py-xs">
        <View className="flex-row items-center gap-sm">
          <AppText variant="h1" className="flex-1">
            Khám phá
          </AppText>
          <AppIconButton
            accessibilityLabel="Công thức đã lưu"
            variant="elevated"
            shape="square"
            icon={<Bookmark size={22} color={colors.textPrimary} />}
            onPress={openFavorites}
          />
        </View>
        <AppInput
          placeholder="Tìm món, nguyên liệu…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Search size={20} color={colors.textSecondary} />}
          rightAdornment={
            <AppIconButton
              accessibilityLabel="Bộ lọc"
              icon={<SlidersHorizontal size={22} color={colors.textPrimary} />}
              onPress={() => navigation.navigate(MAIN_STACK_ROUTES.FILTER_SHEET, { filters })}
            />
          }
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-xs py-sm"
      >
        <AppChip label="Tất cả" selected={!activeTag} onPress={() => setActiveTag(undefined)} />
        {RECIPE_TAG_OPTIONS.map(option => (
          <AppChip
            key={option.id}
            label={option.label}
            selected={activeTag === option.id}
            onPress={() => setActiveTag(option.id)}
          />
        ))}
      </ScrollView>

      <View className="mb-md flex-row items-center gap-sm rounded-card bg-primary-soft p-md">
        <AppIconButton
          accessibilityLabel="Tủ lạnh có gì?"
          icon={<Refrigerator size={26} color={colors.onPrimary} />}
          className="bg-primary"
          onPress={openFridgeScanner}
        />
        <View className="flex-1 gap-xxs">
          <AppText variant="bodyMedium">Tủ lạnh có gì?</AppText>
          <AppText variant="body" color="secondary">
            Chụp ảnh để gợi ý món nấu được
          </AppText>
        </View>
      </View>

      {isLoading ? (
        <LoadingState lines={6} />
      ) : isError ? (
        <ErrorState
          title="Không thể tải dữ liệu"
          description={`${error.message}\nCác công thức đã xem gần đây vẫn mở được khi offline.`}
          onRetry={refetch}
          secondaryActionLabel="Xem công thức đã lưu"
          onSecondaryAction={openFavorites}
        />
      ) : (
        <View className="gap-sm">
          <AppText variant="h2">Gợi ý cho bạn</AppText>
          {excludedAllergenLabels ? (
            <AppText variant="caption" color="secondary">
              {`Đã loại món chứa ${excludedAllergenLabels}`}
            </AppText>
          ) : null}
          {visibleRecipes.length === 0 ? (
            <EmptyState
              title="Chưa có công thức phù hợp"
              description="Thử đổi từ khóa hoặc bộ lọc khác."
            />
          ) : (
            <View className="flex-row flex-wrap gap-sm">
              {visibleRecipes.map(recipe => (
                <View key={recipe.id} className="w-[47%]">
                  <RecipeCard
                    recipe={recipe}
                    isFavorite={favoritesQuery.data?.some(favorite => favorite.id === recipe.id) ?? false}
                    onToggleFavorite={() => handleToggleFavorite(recipe.id)}
                    onPress={() =>
                      navigation.navigate(MAIN_STACK_ROUTES.RECIPE_DETAIL, { recipeId: recipe.id })
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScreenContainer>
  );
}
