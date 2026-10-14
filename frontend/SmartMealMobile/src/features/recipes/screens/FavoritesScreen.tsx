import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeImage } from '../components/RecipeImage';
import { useCollections, useFavoriteRecipes, useToggleFavorite } from '../hooks/useFavorites';
import type { Recipe } from '../types/recipe.types';

type Props = NativeStackScreenProps<MainStackParamList, 'Favorites'>;

type FavoritesTab = 'collections' | 'favorites';

// design/Favorites.dc.html. Yêu thích và bộ sưu tập là dữ liệu server (GET /recipes/favorites,
// /recipes/collections) — chỉ hiện bộ sưu tập của chính người dùng ở đây (bộ sưu tập công khai của
// người khác mở qua liên kết chia sẻ).
export function FavoritesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<FavoritesTab>('collections');
  const favoritesQuery = useFavoriteRecipes();
  const collectionsQuery = useCollections();
  const toggleFavorite = useToggleFavorite();

  const favoriteRecipes = favoritesQuery.data ?? [];
  const myCollections = (collectionsQuery.data ?? []).filter(collection => collection.isOwner);

  const goToRecipe = (recipeId: string) => navigation.navigate(MAIN_STACK_ROUTES.RECIPE_DETAIL, { recipeId });

  const renderFavoriteGrid = (recipes: Recipe[]) => (
    <View className="flex-row flex-wrap gap-sm">
      {recipes.map(recipe => (
        <View key={recipe.id} className="w-[47%]">
          <RecipeCard
            recipe={recipe}
            isFavorite
            onToggleFavorite={() => toggleFavorite.mutate(recipe.id)}
            onPress={() => goToRecipe(recipe.id)}
          />
        </View>
      ))}
    </View>
  );

  const renderFavorites = (limit?: number) => {
    if (favoritesQuery.isLoading) return <LoadingState lines={4} />;
    if (favoritesQuery.isError) {
      return <ErrorState description={favoritesQuery.error.message} onRetry={favoritesQuery.refetch} />;
    }
    if (favoriteRecipes.length === 0) {
      return <EmptyState title="Chưa có món yêu thích" description="Nhấn tim ở công thức để lưu." />;
    }
    return renderFavoriteGrid(limit ? favoriteRecipes.slice(0, limit) : favoriteRecipes);
  };

  const renderCollections = () => {
    if (collectionsQuery.isLoading) return <LoadingState lines={3} />;
    if (collectionsQuery.isError) {
      return <ErrorState description={collectionsQuery.error.message} onRetry={collectionsQuery.refetch} />;
    }
    return (
      <View className="flex-row flex-wrap gap-sm">
        {myCollections.map(collection => (
          <Pressable
            key={collection.id}
            accessibilityRole="button"
            accessibilityLabel={`${collection.name}, ${collection.recipes.length} món`}
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.COLLECTION_DETAIL, { collectionId: collection.id })}
            className="w-[47%] gap-xs rounded-card bg-surface p-sm"
          >
            <RecipeImage
              imageUrl={collection.coverImageUrl ?? collection.recipes[0]?.imageUrl}
              iconSize={20}
              className="h-[52px] rounded-md"
            />
            <AppText variant="bodyMedium" numberOfLines={1}>
              {collection.name}
            </AppText>
            <AppText variant="caption" color="secondary">
              {`${collection.recipes.length} món${collection.isPublic ? ' · Đang chia sẻ' : ''}`}
            </AppText>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tạo bộ sưu tập"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.CREATE_COLLECTION)}
          className="h-[150px] w-[47%] items-center justify-center gap-xs rounded-card border border-dashed border-border-strong"
        >
          <Plus size={24} color={colors.onPrimarySoft} />
          <AppText variant="bodyMedium" color="onPrimarySoft">
            Tạo bộ sưu tập
          </AppText>
        </Pressable>
      </View>
    );
  };

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
          {renderCollections()}

          <View className="gap-sm">
            <View className="flex-row items-center justify-between">
              <AppText variant="h2">Yêu thích gần đây</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel="Xem tất cả" onPress={() => setActiveTab('favorites')}>
                <AppText variant="bodyMedium" color="onPrimarySoft">
                  Xem tất cả
                </AppText>
              </Pressable>
            </View>
            {renderFavorites(2)}
          </View>
        </View>
      ) : (
        renderFavorites()
      )}
    </ScreenContainer>
  );
}
