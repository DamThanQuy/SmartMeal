import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { EmptyState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppText } from '@/components/ui';
import { RECIPE_DATABASE_MOCK } from '@/features/recipes/mocks/recipes.mock';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { RecipeCard } from '../components/RecipeCard';
import { useFavoritesStore } from '../state/favoritesStore';

type Props = NativeStackScreenProps<MainStackParamList, 'Favorites'>;

type FavoritesTab = 'collections' | 'favorites';

// design/Favorites.dc.html. "Tạo bộ sưu tập" chưa có artboard riêng nên tạm disable.
export function FavoritesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<FavoritesTab>('collections');
  const favoriteIds = useFavoritesStore(state => state.favoriteIds);
  const collections = useFavoritesStore(state => state.collections);
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);

  const favoriteRecipes = useMemo(
    () => RECIPE_DATABASE_MOCK.filter(recipe => favoriteIds.includes(recipe.id)),
    [favoriteIds],
  );

  const goToRecipe = (recipeId: string) =>
    navigation.navigate(MAIN_STACK_ROUTES.RECIPE_DETAIL, { recipeId });

  return (
    <ScreenContainer scroll>
      <ScreenHeader title="Đã lưu" onBack={() => navigation.goBack()} />

      <View className="my-md flex-row gap-xxs rounded-md bg-primary-soft p-xxs">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bộ sưu tập"
          accessibilityState={{ selected: activeTab === 'collections' }}
          onPress={() => setActiveTab('collections')}
          className={`h-[40px] flex-1 items-center justify-center rounded-sm ${
            activeTab === 'collections' ? 'bg-surface' : 'bg-transparent'
          }`}
        >
          <AppText variant="bodyMedium" color={activeTab === 'collections' ? 'primary' : 'secondary'}>
            Bộ sưu tập
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Yêu thích (${favoriteRecipes.length})`}
          accessibilityState={{ selected: activeTab === 'favorites' }}
          onPress={() => setActiveTab('favorites')}
          className={`h-[40px] flex-1 items-center justify-center rounded-sm ${
            activeTab === 'favorites' ? 'bg-surface' : 'bg-transparent'
          }`}
        >
          <AppText variant="bodyMedium" color={activeTab === 'favorites' ? 'primary' : 'secondary'}>
            {`Yêu thích (${favoriteRecipes.length})`}
          </AppText>
        </Pressable>
      </View>

      {activeTab === 'collections' ? (
        <View className="gap-lg">
          <View className="flex-row flex-wrap gap-sm">
            {collections.map(collection => (
              <Pressable
                key={collection.id}
                accessibilityRole="button"
                accessibilityLabel={collection.name}
                className="w-[47%] gap-xs rounded-card bg-surface p-sm"
              >
                <View className="h-[52px] rounded-md bg-primary-soft" />
                <AppText variant="bodyMedium">{collection.name}</AppText>
                <AppText variant="caption" color="secondary">
                  {`${collection.recipeCount} món`}
                </AppText>
              </Pressable>
            ))}
            {/* TODO: chưa có artboard tạo bộ sưu tập — để đợt sau. */}
            <View className="h-[150px] w-[47%] items-center justify-center gap-xs rounded-card border border-dashed border-border-strong opacity-40">
              <Plus size={24} color={colors.onPrimarySoft} />
              <AppText variant="bodyMedium" color="onPrimarySoft">
                Tạo bộ sưu tập
              </AppText>
            </View>
          </View>

          <View className="gap-sm">
            <View className="flex-row items-center justify-between">
              <AppText variant="h2">Yêu thích gần đây</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xem tất cả"
                onPress={() => setActiveTab('favorites')}
              >
                <AppText variant="bodyMedium" color="onPrimarySoft">
                  Xem tất cả
                </AppText>
              </Pressable>
            </View>
            {favoriteRecipes.length === 0 ? (
              <EmptyState title="Chưa có món yêu thích" description="Nhấn tim ở công thức để lưu." />
            ) : (
              <View className="flex-row flex-wrap gap-sm">
                {favoriteRecipes.slice(0, 2).map(recipe => (
                  <View key={recipe.id} className="w-[47%]">
                    <RecipeCard recipe={recipe} isFavorite onToggleFavorite={() => toggleFavorite(recipe.id)} onPress={() => goToRecipe(recipe.id)} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      ) : favoriteRecipes.length === 0 ? (
        <EmptyState title="Chưa có món yêu thích" description="Nhấn tim ở công thức để lưu." />
      ) : (
        <View className="flex-row flex-wrap gap-sm">
          {favoriteRecipes.map(recipe => (
            <View key={recipe.id} className="w-[47%]">
              <RecipeCard recipe={recipe} isFavorite onToggleFavorite={() => toggleFavorite(recipe.id)} onPress={() => goToRecipe(recipe.id)} />
            </View>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}
