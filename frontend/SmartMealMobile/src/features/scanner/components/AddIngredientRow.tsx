import { Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';
import { AppButton, AppInput } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

const MAX_INGREDIENT_NAME_LENGTH = 60;

export interface AddIngredientRowProps {
  /** Trả thông báo lỗi (vd. trùng tên) hoặc undefined nếu đã thêm. */
  onAdd: (name: string) => string | undefined;
}

// Fridge (BR-080/082): thêm tay nguyên liệu AI không thấy trong ảnh. Nguyên liệu tự thêm coi như đã
// được người dùng xác nhận.
export function AddIngredientRow({ onAdd }: AddIngredientRowProps) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Nhập tên nguyên liệu');
      return;
    }
    const failure = onAdd(trimmed);
    setError(failure);
    if (!failure) setName('');
  };

  return (
    <View className="flex-row items-start gap-xs">
      <AppInput
        className="flex-1"
        placeholder="Thêm nguyên liệu, vd. trứng gà"
        accessibilityLabel="Tên nguyên liệu muốn thêm"
        leftIcon={<Plus size={20} color={colors.textSecondary} />}
        value={name}
        maxLength={MAX_INGREDIENT_NAME_LENGTH}
        returnKeyType="done"
        onChangeText={text => {
          setName(text);
          setError(undefined);
        }}
        onSubmitEditing={submit}
        error={error}
      />
      <AppButton label="Thêm" variant="secondary" onPress={submit} disabled={!name.trim()} />
    </View>
  );
}
