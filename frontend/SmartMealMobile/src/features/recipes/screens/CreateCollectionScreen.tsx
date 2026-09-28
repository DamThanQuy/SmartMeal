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
import { useFavoritesStore } from '../state/favoritesStore';

type Props = NativeStackScreenProps<MainStackParamList, 'CreateCollection'>;

const NAME_SUGGESTIONS = ['Bữa sáng nhanh', 'Món giảm cân', 'Món cuối tuần', 'Ăn chay'];

// design/CreateCollection.dc.html (BR-150). Bottom sheet mở từ FavoritesScreen "Tạo bộ sưu tập".
// "Cho phép chia sẻ bằng liên kết" chỉ là lựa chọn hiển thị (CollectionDetailScreen "Chia sẻ"
// luôn tạo liên kết xem giả lập bất kể công tắc này, chưa có backend chia sẻ thật).
export function CreateCollectionScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const createCollection = useFavoritesStore(state => state.createCollection);
  const [name, setName] = useState('');
  const [shareable, setShareable] = useState(false);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = createCollection(trimmed);
    navigation.replace(MAIN_STACK_ROUTES.COLLECTION_DETAIL, { collectionId: id });
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

        <AppInput
          label="Tên bộ sưu tập"
          placeholder="VD: Món cuối tuần"
          value={name}
          onChangeText={setName}
        />

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

        <View className="flex-row gap-sm">
          <AppButton label="Hủy" variant="outline" onPress={() => navigation.goBack()} className="flex-shrink" />
          <AppButton
            label="Tạo bộ sưu tập"
            onPress={handleCreate}
            disabled={!name.trim()}
            className="flex-1"
          />
        </View>
      </View>
    </View>
  );
}
