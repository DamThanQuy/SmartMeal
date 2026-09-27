import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Barcode, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyState, ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppCard, AppChip, AppIconButton, AppInput, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { FoodSearchRow } from '../components/FoodSearchRow';
import { useFoodSearch } from '../hooks/useFoodSearch';
import type { FoodSearchFilter } from '../services/nutritionService';

type Props = NativeStackScreenProps<MainStackParamList, 'FoodSearch'>;

const FILTERS: { id: FoodSearchFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'recent', label: 'Gần đây' },
  { id: 'favorite', label: 'Yêu thích' },
  { id: 'mine', label: 'Món của tôi' },
];

// design/FoodSearch.dc.html (BR-052, BR-090). Bảng "N đã chọn" tổng hợp trong artboard được
// đơn giản hoá: mỗi món chọn sẽ mở FoodDetail để chọn serving/khối lượng rồi ghi thẳng vào
// nhật ký (BR-052: Tìm kiếm → Chọn serving → Xác nhận → Lưu), không dùng giỏ chọn nhiều món.
export function FoodSearchScreen({ navigation, route }: Props) {
  const { mealType } = route.params;
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FoodSearchFilter>('all');
  const { data: foods, isLoading, isError, error, refetch } = useFoodSearch(query, filter);

  const resultsTitle = query.trim()
    ? `Kết quả cho "${query.trim()}"`
    : filter === 'recent'
      ? 'Gần đây'
      : filter === 'favorite'
        ? 'Yêu thích'
        : filter === 'mine'
          ? 'Món của tôi'
          : 'Gợi ý cho bạn';

  return (
    <ScreenContainer>
      <ScreenHeader
        title={`Thêm vào ${MEAL_TYPE_TITLES[mealType]}`}
        onBack={() => navigation.goBack()}
      />
      <View className="gap-sm pb-sm">
        <AppInput
          placeholder="Tìm món ăn..."
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
          leftIcon={<Search size={20} color={colors.textSecondary} />}
          rightAdornment={
            <AppIconButton
              accessibilityLabel="Quét mã vạch"
              icon={<Barcode size={22} color={colors.textPrimary} />}
              onPress={() => navigation.navigate(MAIN_STACK_ROUTES.BARCODE, { mealType })}
            />
          }
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-xs"
        >
          {FILTERS.map(item => (
            <AppChip
              key={item.id}
              label={item.label}
              selected={filter === item.id}
              onPress={() => setFilter(item.id)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-md pb-xl">
        {isLoading ? (
          <LoadingState lines={5} />
        ) : isError ? (
          <ErrorState description={error.message} onRetry={refetch} />
        ) : !foods || foods.length === 0 ? (
          <EmptyState
            title="Không tìm thấy món"
            description="Thử từ khóa khác hoặc tạo món thủ công."
          />
        ) : (
          <AppCard className="gap-0">
            <View className="flex-row items-center justify-between pb-sm">
              <AppText variant="h3">{resultsTitle}</AppText>
              <AppText variant="caption" color="secondary">{`${foods.length} món`}</AppText>
            </View>
            {foods.map(food => (
              <FoodSearchRow
                key={food.id}
                food={food}
                onPress={() =>
                  navigation.navigate(MAIN_STACK_ROUTES.FOOD_DETAIL, { foodId: food.id, mealType })
                }
              />
            ))}
          </AppCard>
        )}

        <View className="items-center gap-xxs pt-sm">
          <AppText variant="body" color="secondary">
            Không tìm thấy món?
          </AppText>
          {/* TODO: chưa có artboard "Tạo món thủ công" — để đợt sau. */}
          <AppText variant="bodyMedium" color="onPrimarySoft" className="opacity-40">
            Tạo món thủ công
          </AppText>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
