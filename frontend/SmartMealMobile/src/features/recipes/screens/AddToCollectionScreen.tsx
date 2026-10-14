import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, LoadingState } from '@/components/common';
import { AppButton, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';
import { RecipeImage } from '../components/RecipeImage';
import { useAddRecipeToCollection, useCollections, useRemoveRecipeFromCollection } from '../hooks/useFavorites';

type Props = NativeStackScreenProps<MainStackParamList, 'AddToCollection'>;

// Bottom sheet "Lưu vào bộ sưu tập" mở từ RecipeDetailScreen — design chưa có artboard riêng nên dựng
// theo đúng ngôn ngữ của CreateCollection.dc.html. Chạm một bộ sưu tập để thêm/bỏ món (POST/DELETE
// /recipes/collections/{id}/items); chỉ liệt kê bộ sưu tập của chính người dùng (BR-152).
export function AddToCollectionScreen({ navigation, route }: Props) {
  const { recipeId } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useCollections();
  const addRecipe = useAddRecipeToCollection();
  const removeRecipe = useRemoveRecipeFromCollection();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const myCollections = (data ?? []).filter(collection => collection.isOwner);

  const toggle = (collectionId: string, contains: boolean) => {
    setActionError(null);
    setPendingId(collectionId);
    const options = {
      onError: (mutationError: Error) => setActionError(mutationError.message),
      onSettled: () => setPendingId(null),
    };
    if (contains) {
      removeRecipe.mutate({ collectionId, recipeId }, options);
    } else {
      addRecipe.mutate({ collectionId, recipeId }, options);
    }
  };

  return (
    <View className="flex-1 justify-end">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đóng"
        className="absolute inset-0 bg-overlay/45"
        onPress={() => navigation.goBack()}
      />
      <View
        className="max-h-[80%] gap-md rounded-t-sheet bg-surface p-lg"
        style={[shadows.elevated, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <View className="h-[4px] w-[40px] self-center rounded-pill bg-border" />
        <View className="flex-row items-center justify-between">
          <AppText variant="h2">Lưu vào bộ sưu tập</AppText>
          <AppIconButton
            accessibilityLabel="Đóng"
            icon={<X size={22} color={colors.textPrimary} />}
            onPress={() => navigation.goBack()}
          />
        </View>

        {isLoading ? (
          <LoadingState lines={3} />
        ) : isError ? (
          <ErrorState description={error.message} onRetry={refetch} />
        ) : myCollections.length === 0 ? (
          <EmptyState title="Chưa có bộ sưu tập" description="Tạo bộ sưu tập đầu tiên để lưu món này." />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-0">
            {myCollections.map(collection => {
              const contains = collection.recipes.some(recipe => recipe.id === recipeId);
              return (
                <Pressable
                  key={collection.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={collection.name}
                  accessibilityState={{ checked: contains, busy: pendingId === collection.id }}
                  disabled={pendingId !== null}
                  onPress={() => toggle(collection.id, contains)}
                  className="min-h-[56px] flex-row items-center gap-sm border-t border-border py-xs"
                >
                  <RecipeImage
                    imageUrl={collection.coverImageUrl ?? collection.recipes[0]?.imageUrl}
                    iconSize={18}
                    className="h-[44px] w-[44px] rounded-md"
                  />
                  <View className="flex-1 gap-xxs">
                    <AppText variant="bodyMedium">{collection.name}</AppText>
                    <AppText variant="caption" color="secondary">{`${collection.recipes.length} món`}</AppText>
                  </View>
                  {contains ? <Check size={22} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {actionError ? (
          <AppText variant="caption" color="error" accessibilityRole="alert">
            {actionError}
          </AppText>
        ) : null}

        <AppButton
          label="+ Tạo bộ sưu tập mới"
          variant="secondary"
          onPress={() => navigation.replace(MAIN_STACK_ROUTES.CREATE_COLLECTION, { recipeId })}
        />
      </View>
    </View>
  );
}
