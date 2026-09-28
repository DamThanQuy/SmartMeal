import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Info, Share2, UtensilsCrossed, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { EmptyState, InlineBanner, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppChip, AppIconButton, AppInput, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { RECIPE_TAG_OPTIONS } from '../types/recipe.types';
import { RECIPE_DATABASE_MOCK } from '../mocks/recipes.mock';
import { useFavoritesStore } from '../state/favoritesStore';

type Props = NativeStackScreenProps<MainStackParamList, 'CollectionDetail'>;

// design/CollectionDetail.dc.html (BR-150→152). "Chia sẻ" chỉ tạo liên kết xem giả lập (không
// gọi Share API thật) — CLAUDE.md mục 8. Chỉ chủ sở hữu chỉnh sửa được, mock chỉ có 1 user nên
// luôn đúng (BR-152).
export function CollectionDetailScreen({ navigation, route }: Props) {
  const { collectionId } = route.params;
  const { colors } = useTheme();
  const collection = useFavoritesStore(state => state.collections.find(item => item.id === collectionId));
  const renameCollection = useFavoritesStore(state => state.renameCollection);
  const deleteCollection = useFavoritesStore(state => state.deleteCollection);
  const removeRecipeFromCollection = useFavoritesStore(state => state.removeRecipeFromCollection);

  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(collection?.name ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!collection) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Bộ sưu tập" onBack={() => navigation.goBack()} />
        <EmptyState title="Bộ sưu tập đã bị xóa" description="Quay lại danh sách Đã lưu để xem các bộ sưu tập khác." />
      </ScreenContainer>
    );
  }

  const recipes = collection.recipeIds
    .map(id => RECIPE_DATABASE_MOCK.find(recipe => recipe.id === id))
    .filter((recipe): recipe is (typeof RECIPE_DATABASE_MOCK)[number] => Boolean(recipe));

  const handleDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteCollection(collection.id);
    navigation.goBack();
  };

  const handleShare = () => {
    setLinkCopied(true);
  };

  const submitRename = () => {
    if (draftName.trim()) renameCollection(collection.id, draftName.trim());
    setIsRenaming(false);
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
            onPress={handleShare}
          />
        }
      />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-lg py-sm">
        {isRenaming ? (
          <View className="flex-row items-end gap-sm">
            <AppInput label="Tên bộ sưu tập" value={draftName} onChangeText={setDraftName} className="flex-1" />
            <AppButton label="Xong" onPress={submitRename} className="h-[48px]" />
          </View>
        ) : (
          <View className="gap-xxs">
            <AppText variant="h1">{collection.name}</AppText>
            <AppText variant="body" color="secondary">
              {`${recipes.length} món · Chỉ mình bạn chỉnh sửa được`}
            </AppText>
          </View>
        )}

        <View className="flex-row flex-wrap gap-xs">
          <AppChip
            label="Đổi tên"
            onPress={() => {
              setDraftName(collection.name);
              setIsRenaming(true);
            }}
          />
          <AppChip label={linkCopied ? 'Đã tạo liên kết' : 'Chia sẻ'} onPress={handleShare} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={confirmingDelete ? 'Xác nhận xóa bộ sưu tập' : 'Xóa bộ sưu tập'}
            onPress={handleDelete}
            className={`h-[36px] items-center justify-center rounded-pill border px-md ${
              confirmingDelete ? 'border-error bg-error-soft' : 'border-border bg-surface'
            }`}
          >
            <AppText variant="bodyMedium" color={confirmingDelete ? 'error' : 'primary'}>
              {confirmingDelete ? 'Xác nhận xóa?' : 'Xóa'}
            </AppText>
          </Pressable>
        </View>

        {recipes.length === 0 ? (
          <EmptyState title="Chưa có món nào" description="Thêm món từ Khám phá vào bộ sưu tập này." />
        ) : (
          <View className="gap-0">
            {recipes.map(recipe => {
              const tagLabel = RECIPE_TAG_OPTIONS.find(option => option.id === recipe.tags[0])?.label;
              return (
                <View key={recipe.id} className="flex-row items-center gap-sm border-t border-border py-sm">
                  <View className="h-[64px] w-[64px] items-center justify-center rounded-md bg-primary-soft">
                    <UtensilsCrossed size={22} color={colors.primary} />
                  </View>
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
                  <AppIconButton
                    accessibilityLabel={`Bỏ ${recipe.name} khỏi bộ sưu tập`}
                    icon={<X size={20} color={colors.textSecondary} />}
                    onPress={() => removeRecipeFromCollection(collection.id, recipe.id)}
                  />
                </View>
              );
            })}
          </View>
        )}

        <AppButton
          label="Thêm món vào bộ sưu tập"
          variant="secondary"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, { screen: MAIN_TAB_ROUTES.DISCOVER })}
        />

        <InlineBanner
          icon={<Info size={20} color={colors.info} />}
          description="Chia sẻ tạo liên kết chỉ xem. Người nhận không chỉnh sửa hay xóa được bộ sưu tập của bạn."
        />
        {linkCopied ? (
          <View className="flex-row items-center gap-xxs">
            <Check size={14} color={colors.primary} />
            <AppText variant="caption" color="secondary">
              Đã tạo liên kết xem (giả lập) — chưa có backend chia sẻ thật.
            </AppText>
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
