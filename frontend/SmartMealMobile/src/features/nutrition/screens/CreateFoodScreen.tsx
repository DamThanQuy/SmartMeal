import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Info } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import { z } from 'zod';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppChip, AppInput, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { useAddMealLogEntries } from '../hooks/useDiary';
import { useCreateFood } from '../hooks/useFoodSearch';
import { todayIso } from '../services/nutritionService';

type Props = NativeStackScreenProps<MainStackParamList, 'CreateFood'>;

const UNITS = ['g', 'ml', 'phần'] as const;

const numericField = (message: string) =>
  z
    .string()
    .min(1, { message: 'Bắt buộc' })
    .refine(value => Number.isFinite(Number(value)) && Number(value) >= 0, { message });

const createFoodSchema = z.object({
  name: z.string().min(1, { message: 'Bắt buộc' }),
  amount: numericField('Khẩu phần không hợp lệ').refine(value => Number(value) > 0, {
    message: 'Khẩu phần không hợp lệ',
  }),
  unit: z.enum(UNITS),
  calories: numericField('Không hợp lệ'),
  proteinG: numericField('Không hợp lệ'),
  carbsG: numericField('Không hợp lệ'),
  fatG: numericField('Không hợp lệ'),
  sugarG: z.string().optional(),
  sodiumMg: z.string().optional(),
});

type CreateFoodFormValues = z.infer<typeof createFoodSchema>;

// design/CreateFood.dc.html (BR-121). Đích mới cho ProductNotFound "Nhập thủ công" (trước trỏ
// tạm FoodSearch). Món tạo ra gắn "Do bạn nhập" — không tính là dữ liệu đã xác minh, không tự
// bịa số liệu thay Backend (chỉ ghi đúng số user nhập).
export function CreateFoodScreen({ navigation, route }: Props) {
  const { mealType } = route.params;
  const { colors } = useTheme();
  const createFood = useCreateFood();
  const addMealLogEntries = useAddMealLogEntries(todayIso());
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFoodFormValues>({
    resolver: zodResolver(createFoodSchema),
    defaultValues: {
      name: '',
      amount: '',
      unit: 'g',
      calories: '',
      proteinG: '',
      carbsG: '',
      fatG: '',
      sugarG: '',
      sodiumMg: '',
    },
  });

  const isSaving = createFood.isPending || addMealLogEntries.isPending;

  const onSubmit = handleSubmit(values => {
    const amount = Number(values.amount);
    const nutrition = {
      calories: Number(values.calories),
      proteinG: Number(values.proteinG),
      carbsG: Number(values.carbsG),
      fatG: Number(values.fatG),
      sugarG: values.sugarG ? Number(values.sugarG) : undefined,
      sodiumMg: values.sodiumMg ? Number(values.sodiumMg) : undefined,
    };
    createFood.mutate(
      { name: values.name, amount, unit: values.unit, nutrition },
      {
        onSuccess: food => {
          addMealLogEntries.mutate(
            {
              mealType,
              entries: [
                {
                  foodName: food.name,
                  servingLabel: `${amount} ${values.unit}`,
                  grams: amount,
                  nutrition,
                  source: 'manual',
                },
              ],
            },
            {
              onSuccess: () => {
                navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
                  screen: MAIN_TAB_ROUTES.DIARY,
                  params: { toast: `Đã ghi 1 món vào ${MEAL_TYPE_TITLES[mealType]}` },
                });
              },
            },
          );
        },
      },
    );
  });

  return (
    <ScreenContainer>
      <ScreenHeader title="Tạo món thủ công" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-md py-xs"
      >
        <AppText variant="body" color="secondary">
          Nhập giá trị dinh dưỡng từ bao bì. Bạn có thể sửa lại sau trong nhật ký.
        </AppText>

        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange } }) => (
            <AppInput
              label="Tên món / sản phẩm"
              placeholder="VD: Bánh quy yến mạch"
              value={value}
              onChangeText={onChange}
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="amount"
          render={({ field: { value, onChange } }) => (
            <AppInput
              label="Khẩu phần"
              placeholder="0"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              error={errors.amount?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="unit"
          render={({ field: { value, onChange } }) => (
            <View className="gap-xs">
              <AppText variant="bodyMedium">Đơn vị</AppText>
              <View className="flex-row gap-xs">
                {UNITS.map(unit => (
                  <AppChip key={unit} label={unit} selected={value === unit} onPress={() => onChange(unit)} />
                ))}
              </View>
            </View>
          )}
        />

        <View className="flex-row gap-sm">
          <Controller
            control={control}
            name="calories"
            render={({ field: { value, onChange } }) => (
              <AppInput
                label="Calo"
                placeholder="0"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                error={errors.calories?.message}
                rightAdornment={
                  <AppText variant="body" color="secondary">
                    kcal
                  </AppText>
                }
                className="flex-1"
              />
            )}
          />
          <Controller
            control={control}
            name="proteinG"
            render={({ field: { value, onChange } }) => (
              <AppInput
                label="Protein"
                placeholder="0"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                error={errors.proteinG?.message}
                rightAdornment={
                  <AppText variant="body" color="secondary">
                    g
                  </AppText>
                }
                className="flex-1"
              />
            )}
          />
        </View>

        <View className="flex-row gap-sm">
          <Controller
            control={control}
            name="carbsG"
            render={({ field: { value, onChange } }) => (
              <AppInput
                label="Carbs"
                placeholder="0"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                error={errors.carbsG?.message}
                rightAdornment={
                  <AppText variant="body" color="secondary">
                    g
                  </AppText>
                }
                className="flex-1"
              />
            )}
          />
          <Controller
            control={control}
            name="fatG"
            render={({ field: { value, onChange } }) => (
              <AppInput
                label="Fat"
                placeholder="0"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                error={errors.fatG?.message}
                rightAdornment={
                  <AppText variant="body" color="secondary">
                    g
                  </AppText>
                }
                className="flex-1"
              />
            )}
          />
        </View>

        <View className="flex-row gap-sm">
          <Controller
            control={control}
            name="sugarG"
            render={({ field: { value, onChange } }) => (
              <AppInput
                label="Đường (tùy chọn)"
                placeholder="0"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                rightAdornment={
                  <AppText variant="body" color="secondary">
                    g
                  </AppText>
                }
                className="flex-1"
              />
            )}
          />
          <Controller
            control={control}
            name="sodiumMg"
            render={({ field: { value, onChange } }) => (
              <AppInput
                label="Natri (tùy chọn)"
                placeholder="0"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                rightAdornment={
                  <AppText variant="body" color="secondary">
                    mg
                  </AppText>
                }
                className="flex-1"
              />
            )}
          />
        </View>

        <View className="flex-row items-start gap-sm rounded-md border border-border bg-surface p-md">
          <Info size={20} color={colors.info} />
          <AppText variant="caption" color="secondary" className="flex-1">
            Món do bạn tự nhập được đánh dấu &quot;Do bạn nhập&quot; và không tính là dữ liệu đã xác minh.
          </AppText>
        </View>

        {createFood.isError ? (
          <AppText variant="caption" color="error" className="text-center">
            {createFood.error.message}
          </AppText>
        ) : null}
        {addMealLogEntries.isError ? (
          <AppText variant="caption" color="error" className="text-center">
            {addMealLogEntries.error.message}
          </AppText>
        ) : null}
      </ScrollView>

      <View className="flex-row gap-sm py-md">
        <AppButton label="Hủy" variant="outline" onPress={() => navigation.goBack()} className="flex-shrink" />
        <AppButton
          label="Lưu và ghi vào nhật ký"
          onPress={onSubmit}
          loading={isSaving}
          className="flex-1"
        />
      </View>
    </ScreenContainer>
  );
}
