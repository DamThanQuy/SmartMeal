import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { Info, Share2, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { EmptyState, ErrorState, InlineBanner, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppChip, AppIconButton, AppInput, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { RecipeImage } from '../components/RecipeImage';
import {
  useCollection,
  useCreateCollectionShareLink,
  useDeleteCollection,
  useRemoveRecipeFromCollection,
  useRevokeCollectionShareLink,
  useUpdateCollection,
} from '../hooks/useFavorites';
import { RECIPE_TAG_OPTIONS } from '../types/recipe.types';

type Props = NativeStackScreenProps<MainStackParamList, 'CollectionDetail'>;

/** Liên kết mở thẳng bộ sưu tập công khai theo id (deep link, xem src/navigation/linking.ts). */
export function collectionShareUrl(collectionId: string): string {
  return Linking.createURL(`collections/${collectionId}`);
}

/** Liên kết chia sẻ chỉ đọc theo mã — mở được cả bộ sưu tập riêng tư, chủ sở hữu tắt được. */
export function sharedCollectionUrl(shareToken: string): string {
  return Linking.createURL(`shared/collections/${shareToken}`);
}

// design/CollectionDetail.dc.html (BR-150→152). Chỉ chủ sở hữu đổi tên/xóa/bỏ món (`isOwner` do BE
// trả). "Chia sẻ" tạo liên kết chỉ đọc có mã (bộ sưu tập vẫn riêng tư) rồi mở hộp chia sẻ của hệ điều
// hành; "Tắt liên kết" làm liên kết cũ hết hiệu lực. Người nhận (đã đăng nhập) chỉ xem được.
export function CollectionDetailScreen({ navigation, route }: Props) {
  const { collectionId } = route.params;
  const { colors } = useTheme();
  const { data: collection, isLoading, isError, error, refetch } = useCollection(collectionId);
  const updateCollection = useUpdateCollection(collectionId);
  const deleteCollection = useDeleteCollection();
  const removeRecipe = useRemoveRecipeFromCollection();
  const createShareLink = useCreateCollectionShareLink(collectionId);
  const revokeShareLink = useRevokeCollectionShareLink(collectionId);

  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Bộ sưu tập" onBack={() => navigation.goBack()} />
        <LoadingState lines={5} />
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Bộ sưu tập" onBack={() => navigation.goBack()} />
        <ErrorState description={error.message} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  if (!collection) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Bộ sưu tập" onBack={() => navigation.goBack()} />
        <EmptyState
          title="Không tìm thấy bộ sưu tập"
          description="Bộ sưu tập đã bị xóa hoặc chủ sở hữu đã ngừng chia sẻ."
        />
      </ScreenContainer>
    );
  }

  const isOwner = collection.isOwner;
  const busy =
    updateCollection.isPending ||
    deleteCollection.isPending ||
    removeRecipe.isPending ||
    createShareLink.isPending ||
    revokeShareLink.isPending;

  const handleDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setActionError(null);
    deleteCollection.mutate(collection.id, {
      onSuccess: () => navigation.goBack(),
      onError: mutationError => setActionError(mutationError.message),
    });
  };

  const handleShare = async () => {
    setActionError(null);
    try {
      // Chủ sở hữu chia sẻ bằng liên kết có mã (không cần công khai); người xem bộ sưu tập công khai chia sẻ lại theo id.
      const url = isOwner
        ? sharedCollectionUrl(collection.shareToken ?? (await createShareLink.mutateAsync()).shareToken)
        : collectionShareUrl(collection.id);
      await Share.share({ message: `Bộ sưu tập "${collection.name}" trên SmartMeal: ${url}` });
    } catch (shareError) {
      setActionError(shareError instanceof Error ? shareError.message : 'Không chia sẻ được, vui lòng thử lại.');
    }
  };

  const stopSharing = () => {
    setActionError(null);
    revokeShareLink.mutate(undefined, { onError: mutationError => setActionError(mutationError.message) });
  };

  const stopPublic = () => {
    setActionError(null);
    updateCollection.mutate({ isPublic: false }, { onError: mutationError => setActionError(mutationError.message) });
  };

  const ownerStatus = collection.shareToken
    ? 'Đang chia sẻ bằng liên kết, chỉ mình bạn chỉnh sửa được'
    : collection.isPublic
      ? 'Công khai, chỉ mình bạn chỉnh sửa được'
      : 'Chỉ mình bạn chỉnh sửa được';

  const submitRename = () => {
    const name = draftName.trim();
    setActionError(null);
    if (!name || name === collection.name) {
      setIsRenaming(false);
      return;
    }
    updateCollection.mutate(
      { name },
      {
        onSuccess: () => setIsRenaming(false),
        onError: mutationError => setActionError(mutationError.message),
      },
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Bộ sưu tập"
        onBack={() => navigation.goBack()}
        rightContent={
          <AppIconButton
            accessibilityLabel="Chia sẻ bộ sưu tập"
            variant="elevated"
            shape="square"
            icon={<Share2 size={22} color={colors.textPrimary} />}
            onPress={() => void handleShare()}
            disabled={busy || (!isOwner && !collection.isPublic)}
          />
        }
      />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-lg py-sm">
        {isRenaming ? (
          <View className="flex-row items-end gap-sm">
            <AppInput label="Tên bộ sưu tập" value={draftName} onChangeText={setDraftName} className="flex-1" />
            <AppButton label="Xong" onPress={submitRename} loading={updateCollection.isPending} className="h-[48px]" />
          </View>
        ) : (
          <View className="gap-xxs">
            <AppText variant="h1">{collection.name}</AppText>
            <AppText variant="body" color="secondary">
              {`${collection.recipes.length} món · ${
                isOwner ? ownerStatus : 'Bộ sưu tập được chia sẻ — chỉ xem'
              }`}
            </AppText>
          </View>
        )}

        {isOwner ? (
          <View className="flex-row flex-wrap gap-xs">
            <AppChip
              label="Đổi tên"
              onPress={() => {
                setDraftName(collection.name);
                setIsRenaming(true);
              }}
            />
            <AppChip label="Chia sẻ" onPress={() => void handleShare()} />
            {collection.shareToken ? <AppChip label="Tắt liên kết" onPress={stopSharing} /> : null}
            {collection.isPublic ? <AppChip label="Ngừng công khai" onPress={stopPublic} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmingDelete ? 'Xác nhận xóa bộ sưu tập' : 'Xóa bộ sưu tập'}
              onPress={handleDelete}
              disabled={busy}
              className={`h-[36px] items-center justify-center rounded-pill border px-md ${
                confirmingDelete ? 'border-error bg-error-soft' : 'border-border bg-surface'
              }`}
            >
              <AppText variant="bodyMedium" color={confirmingDelete ? 'error' : 'primary'}>
                {confirmingDelete ? 'Xác nhận xóa?' : 'Xóa'}
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {actionError ? (
          <AppText variant="caption" color="error" accessibilityRole="alert">
            {actionError}
          </AppText>
        ) : null}

        {collection.recipes.length === 0 ? (
          <EmptyState title="Chưa có món nào" description="Thêm món từ Khám phá vào bộ sưu tập này." />
        ) : (
          <View className="gap-0">
            {collection.recipes.map(recipe => {
              const tagLabel = RECIPE_TAG_OPTIONS.find(option => option.id === recipe.tags[0])?.label;
              return (
                <View key={recipe.id} className="flex-row items-center gap-sm border-t border-border py-sm">
                  <RecipeImage imageUrl={recipe.imageUrl} iconSize={22} className="h-[64px] w-[64px] rounded-md" />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={recipe.name}
                    onPress={() => navigation.navigate(MAIN_STACK_ROUTES.RECIPE_DETAIL, { recipeId: recipe.id })}
                    className="flex-1 gap-xxs"
                  >
                    <AppText variant="bodyMedium">{recipe.name}</AppText>
                    <AppText variant="caption" color="secondary">
                      {`${recipe.durationMinutes} phút · ${recipe.nutritionPerServing.calories} kcal`}
                    </AppText>
                    {tagLabel ? <AppBadge label={tagLabel} /> : null}
                  </Pressable>
                  {isOwner ? (
                    <AppIconButton
                      accessibilityLabel={`Bỏ ${recipe.name} khỏi bộ sưu tập`}
                      icon={<X size={20} color={colors.textSecondary} />}
                      disabled={busy}
                      onPress={() =>
                        removeRecipe.mutate(
                          { collectionId: collection.id, recipeId: recipe.id },
                          { onError: mutationError => setActionError(mutationError.message) },
                        )
                      }
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {isOwner ? (
          <AppButton
            label="Thêm món vào bộ sưu tập"
            variant="secondary"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, { screen: MAIN_TAB_ROUTES.DISCOVER })}
          />
        ) : null}

        <InlineBanner
          icon={<Info size={20} color={colors.info} />}
          description="Chia sẻ tạo liên kết chỉ xem, bộ sưu tập vẫn riêng tư. Người nhận không chỉnh sửa hay xóa được; tắt liên kết thì liên kết cũ không mở được nữa."
        />
      </ScrollView>
    </ScreenContainer>
  );
}
