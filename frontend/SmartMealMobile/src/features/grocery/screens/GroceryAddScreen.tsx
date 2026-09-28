import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import { AppButton, AppChip, AppIconButton, AppInput, AppText } from '@/components/ui';
import type { MainStackParamList } from '@/navigation/types';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';
import { useAddManualGroceryItem } from '../hooks/useGrocery';
import { GROCERY_CATEGORY_ORDER, estimateItemCostVnd, manualQuantityToParsedAmount } from '../utils/groceryAggregation';

type Props = NativeStackScreenProps<MainStackParamList, 'GroceryAdd'>;

const UNITS = ['g', 'kg', 'ml', 'quả', 'bó', 'gói'] as const;

const groceryAddSchema = z.object({
  name: z.string().min(1, { message: 'Bắt buộc' }),
  quantity: z
    .string()
    .min(1, { message: 'Bắt buộc' })
    .refine(value => Number.isFinite(Number(value)) && Number(value) > 0, {
      message: 'Số lượng không hợp lệ',
    }),
  unit: z.enum(UNITS),
  category: z.enum(GROCERY_CATEGORY_ORDER),
});

type GroceryAddFormValues = z.infer<typeof groceryAddSchema>;

// design/GroceryAdd.dc.html (BR-172, BR-174). Bottom sheet mở từ GroceryScreen (EmptyState "Thêm
// nguyên liệu thủ công"), presentation:'transparentModal'. Nhóm đọc từ GROCERY_CATEGORY_ORDER
// (nguồn duy nhất, dùng chung với categorizeIngredient cho nguyên liệu sinh từ Meal Plan).
export function GroceryAddScreen({ navigation, route }: Props) {
  const { weekStartIso } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const addManualItem = useAddManualGroceryItem(weekStartIso);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GroceryAddFormValues>({
    resolver: zodResolver(groceryAddSchema),
    defaultValues: { name: '', quantity: '', unit: 'g', category: 'Rau củ' },
  });

  const quantity = watch('quantity');
  const unit = watch('unit');
  const name = watch('name');
  const previewCost =
    Number(quantity) > 0
      ? estimateItemCostVnd(name || 'nguyên liệu', manualQuantityToParsedAmount(Number(quantity), unit))
      : 0;

  const onSubmit = handleSubmit(values => {
    addManualItem.mutate(
      {
        name: values.name,
        quantity: Number(values.quantity),
        unit: values.unit,
        category: values.category,
      },
      { onSuccess: () => navigation.goBack() },
    );
  });

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
          <AppText variant="h2">Thêm nguyên liệu</AppText>
          <AppIconButton
            accessibilityLabel="Đóng"
            icon={<X size={22} color={colors.textPrimary} />}
            onPress={() => navigation.goBack()}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-md" className="max-h-[420px]">
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange } }) => (
              <AppInput
                label="Tên nguyên liệu"
                placeholder="VD: Hành lá"
                value={value}
                onChangeText={onChange}
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="quantity"
            render={({ field: { value, onChange } }) => (
              <AppInput
                label="Số lượng"
                placeholder="0"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                error={errors.quantity?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="unit"
            render={({ field: { value, onChange } }) => (
              <View className="gap-sm">
                <AppText variant="bodyMedium">Đơn vị</AppText>
                <View className="flex-row flex-wrap gap-xs">
                  {UNITS.map(item => (
                    <AppChip key={item} label={item} selected={value === item} onPress={() => onChange(item)} />
                  ))}
                </View>
              </View>
            )}
          />

          <Controller
            control={control}
            name="category"
            render={({ field: { value, onChange } }) => (
              <View className="gap-sm">
                <AppText variant="bodyMedium">Nhóm</AppText>
                <View className="flex-row flex-wrap gap-xs">
                  {GROCERY_CATEGORY_ORDER.map(item => (
                    <AppChip key={item} label={item} selected={value === item} onPress={() => onChange(item)} />
                  ))}
                </View>
              </View>
            )}
          />

          <AppText variant="caption" color="secondary">
            {`Giá ước tính: khoảng ${previewCost.toLocaleString('vi-VN')}đ (tự tính từ bảng giá trung bình)`}
          </AppText>

          {addManualItem.isError ? (
            <AppText variant="caption" color="error">
              {addManualItem.error.message}
            </AppText>
          ) : null}
        </ScrollView>

        <View className="flex-row gap-sm">
          <AppButton label="Hủy" variant="outline" onPress={() => navigation.goBack()} className="flex-shrink" />
          <AppButton
            label="Thêm vào danh sách"
            onPress={onSubmit}
            loading={addManualItem.isPending}
            className="flex-1"
          />
        </View>
      </View>
    </View>
  );
}
