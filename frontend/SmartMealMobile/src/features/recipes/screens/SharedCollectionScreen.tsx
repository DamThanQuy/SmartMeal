import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Info, Link2Off } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { EmptyState, ErrorState, InlineBanner, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { RecipeImage } from '../components/RecipeImage';
import { useSharedCollection } from '../hooks/useFavorites';
import { RECIPE_TAG_OPTIONS } from '../types/recipe.types';

type Props = NativeStackScreenProps<MainStackParamList, 'SharedCollection'>;

// Mở từ liên kết chia sẻ (deep link smartmealmobile://shared/collections/<mã>, BR-150→152): chỉ xem, không sửa
// được bộ sưu tập của người khác. Chủ sở hữu tắt liên kết thì màn này báo liên kết không còn hiệu lực.
export function SharedCollectionScreen({ navigation, route }: Props) {
  const { token } = route.params;
  const { colors } = useTheme();
  const { data: collection, isLoading, isError, error, refetch } = useSharedCollection(token);

  const header = <ScreenHeader title="Bộ sưu tập được chia sẻ" onBack={() => navigation.goBack()} />;

  if (isLoading) {
    return (
      <ScreenContainer>
        {header}
        <LoadingState lines={5} />
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        {header}
        <ErrorState description={error.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  if (!collection) {
    return (
      <ScreenContainer>
        {header}
        <EmptyState
          icon={<Link2Off size={40} color={colors.textSecondary} />}
          title="Liên kết không còn hiệu lực"
          description="Chủ sở hữu đã tắt liên kết chia sẻ hoặc xóa bộ sưu tập này."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {header}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-lg py-sm">
        <View className="gap-xxs">
          <AppText variant="h1">{collection.name}</AppText>
          {collection.description ? (
            <AppText variant="body" color="secondary">
              {collection.description}
            </AppText>
          ) : null}
          <AppText variant="caption" color="secondary">
            {`${collection.recipes.length} món · chỉ xem`}
          </AppText>
        </View>

        {collection.isOwner ? (
          <AppButton
            label="Mở để chỉnh sửa"
            variant="secondary"
            onPress={() => navigation.replace(MAIN_STACK_ROUTES.COLLECTION_DETAIL, { collectionId: collection.id })}
          />
        ) : null}

        {collection.recipes.length === 0 ? (
          <EmptyState title="Chưa có món nào" description="Bộ sưu tập này hiện chưa có món ăn." />
        ) : (
          <View className="gap-0">
            {collection.recipes.map(recipe => {
              const tagLabel = RECIPE_TAG_OPTIONS.find(option => option.id === recipe.tags[0])?.label;
              return (
                <Pressable
                  key={recipe.id}
                  accessibilityRole="button"
                  accessibilityLabel={recipe.name}
                  onPress={() => navigation.navigate(MAIN_STACK_ROUTES.RECIPE_DETAIL, { recipeId: recipe.id })}
                  className="min-h-[64px] flex-row items-center gap-sm border-t border-border py-sm"
                >
                  <RecipeImage imageUrl={recipe.imageUrl} iconSize={22} className="h-[64px] w-[64px] rounded-md" />
                  <View className="flex-1 gap-xxs">
                    <AppText variant="bodyMedium">{recipe.name}</AppText>
                    <AppText variant="caption" color="secondary">
                      {`${recipe.durationMinutes} phút · ${recipe.nutritionPerServing.calories} kcal`}
                    </AppText>
                    {tagLabel ? <AppBadge label={tagLabel} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <InlineBanner
          icon={<Info size={20} color={colors.info} />}
          description="Món chứa chất gây dị ứng bạn đã khai báo sẽ được cảnh báo ở trang chi tiết món."
        />
      </ScrollView>
    </ScreenContainer>
  );
}
