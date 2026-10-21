import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Keyboard, View } from 'react-native';
import { z } from 'zod';
import { AppButton, AppInput } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

const MAX_INGREDIENT_NAME_LENGTH = 60;

const ingredientNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nhập tên nguyên liệu')
    .max(MAX_INGREDIENT_NAME_LENGTH, 'Tên nguyên liệu quá dài'),
});

type IngredientNameValues = z.infer<typeof ingredientNameSchema>;

export interface AddIngredientRowProps {
  /** Trả thông báo lỗi (vd. trùng tên) hoặc undefined nếu đã thêm. */
  onAdd: (name: string) => string | undefined;
  initialName?: string;
  submitLabel?: string;
  inputAccessibilityLabel?: string;
  onCancel?: () => void;
}

// Fridge (BR-080/082): thêm tay nguyên liệu AI không thấy trong ảnh. Nguyên liệu tự thêm coi như đã
// được người dùng xác nhận.
export function AddIngredientRow({
  onAdd,
  initialName = '',
  submitLabel = 'Thêm',
  inputAccessibilityLabel = 'Tên nguyên liệu muốn thêm',
  onCancel,
}: AddIngredientRowProps) {
  const { colors } = useTheme();
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IngredientNameValues>({
    resolver: zodResolver(ingredientNameSchema),
    defaultValues: { name: initialName },
  });
  const name = useWatch({ control, name: 'name', defaultValue: initialName });

  const submit = handleSubmit(values => {
    const failure = onAdd(values.name);
    if (failure) {
      setError('name', { type: 'manual', message: failure });
    } else {
      reset({ name: '' });
      Keyboard.dismiss();
    }
  });

  return (
    <View className="gap-xs">
      <View className="flex-row items-start gap-xs">
        <View className="min-w-0 flex-1">
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <AppInput
                className="w-full"
                placeholder="VD: Trứng gà, cà chua"
                accessibilityLabel={inputAccessibilityLabel}
                leftIcon={
                  onCancel ? undefined : (
                    <Plus size={20} color={colors.textSecondary} />
                  )
                }
                value={value}
                autoFocus={Boolean(onCancel)}
                maxLength={MAX_INGREDIENT_NAME_LENGTH}
                returnKeyType="done"
                onChangeText={text => {
                  onChange(text);
                  clearErrors('name');
                }}
                onBlur={onBlur}
                onSubmitEditing={() => void submit()}
                error={errors.name?.message}
              />
            )}
          />
        </View>
        <AppButton
          label={submitLabel}
          variant="secondary"
          onPress={() => void submit()}
          disabled={!name.trim() || isSubmitting}
        />
      </View>
      {onCancel ? (
        <AppButton label="Hủy chỉnh sửa" variant="text" onPress={onCancel} />
      ) : null}
    </View>
  );
}
