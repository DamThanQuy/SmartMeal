import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppChip, AppIconButton, AppInput, AppSwitch, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';
import { useAddRecipeToCollection, useCreateCollection } from '../hooks/useFavorites';

type Props = NativeStackScreenProps<MainStackParamList, 'CreateCollection'>;

const NAME_SUGGESTIONS = ['Bữa sáng nhanh', 'Món giảm cân', 'Món cuối tuần', 'Ăn chay'];

// design/CreateCollection.dc.html (BR-150). Bottom sheet mở từ FavoritesScreen "Tạo bộ sưu tập" hoặc từ
// AddToCollectionScreen (có `recipeId` → thêm luôn món đang xem vào bộ sưu tập mới). "Cho phép chia sẻ
// bằng liên kết" = tạo bộ sưu tập công khai (isPublic) trên server.
export function CreateCollectionScreen({ navigation, route }: Props) {
  const recipeId = route.params?.recipeId;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const createCollection = useCreateCollection();
  const addRecipe = useAddRecipeToCollection();
  const [name, setName] = useState('');
  const [shareable, setShareable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = createCollection.isPending || addRecipe.isPending;

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const collection = await createCollection.mutateAsync({ name: trimmed, isPublic: shareable });
      if (recipeId) {
        await addRecipe.mutateAsync({ collectionId: collection.id, recipeId });
      }
      navigation.replace(MAIN_STACK_ROUTES.COLLECTION_DETAIL, { collectionId: collection.id });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Không tạo được bộ sưu tập, vui lòng thử lại.');
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
        className="gap-lg rounded-t-sheet bg-surface p-lg"
        style={[shadows.elevated, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <View className="h-[4px] w-[40px] self-center rounded-pill bg-border" />
        <View className="flex-row items-center justify-between">
          <AppText variant="h2">Bộ sưu tập mới</AppText>
          <AppIconButton
            accessibilityLabel="Đóng"
            icon={<X size={22} color={colors.textPrimary} />}
            onPress={() => navigation.goBack()}
          />
        </View>

        <AppInput label="Tên bộ sưu tập" placeholder="VD: Món cuối tuần" value={name} onChangeText={setName} />

        <View className="gap-sm">
          <AppText variant="bodyMedium">Gợi ý tên</AppText>
          <View className="flex-row flex-wrap gap-xs">
            {NAME_SUGGESTIONS.map(suggestion => (
              <AppChip
                key={suggestion}
                label={suggestion}
                selected={name === suggestion}
                onPress={() => setName(suggestion)}
              />
            ))}
          </View>
        </View>

        <View className="flex-row items-center gap-sm">
          <View className="flex-1 gap-xxs">
            <AppText variant="bodyMedium">Cho phép chia sẻ bằng liên kết</AppText>
            <AppText variant="caption" color="secondary">
              Người nhận chỉ xem, không chỉnh sửa hay xóa được
            </AppText>
          </View>
          <AppSwitch accessibilityLabel="Chia sẻ bằng liên kết" checked={shareable} onChange={setShareable} />
        </View>

        {error ? (
          <AppText variant="caption" color="error" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}

        <View className="flex-row gap-sm">
          <AppButton label="Hủy" variant="outline" onPress={() => navigation.goBack()} className="flex-shrink" />
          <AppButton
            label="Tạo bộ sưu tập"
            onPress={() => void handleCreate()}
            disabled={!name.trim()}
            loading={saving}
            className="flex-1"
          />
        </View>
      </View>
    </View>
  );
}
