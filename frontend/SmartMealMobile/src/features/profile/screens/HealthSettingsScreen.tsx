import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Info, Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { InlineBanner, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppButton, AppCard, AppChip, AppInput, AppText } from '@/components/ui';
import {
  ALLERGY_OPTIONS,
  DIETARY_PREFERENCE_OPTIONS,
  HEALTH_CONDITION_OPTIONS,
  OTHER_ALLERGIES_MAX_LENGTH,
  useUpdateHealthSettings,
} from '@/features/health';
import type { MainStackParamList } from '@/navigation/types';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'HealthSettings'>;

// design/HealthSettings.dc.html (BR-001→BR-003, BR-101/102, BR-110/111, BR-112). Cùng pattern
// chip chọn nhiều với HPAllergy/HealthProfileConditions/HealthProfileDietScreen (Đợt 1) để tái
// dùng đúng ngôn ngữ UI, thay vì checkbox riêng như artboard gốc vẽ cho phần "Tình trạng sức khỏe".
export function HealthSettingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const profile = useUserProfileStore();
  const updateSettings = useUpdateHealthSettings();
  const [allergyIds, setAllergyIds] = useState<string[]>(profile.allergyIds);
  const [healthConditionIds, setHealthConditionIds] = useState<string[]>(
    profile.healthConditionIds,
  );
  const [dietaryPreferenceIds, setDietaryPreferenceIds] = useState<string[]>(
    profile.dietaryPreferenceIds,
  );
  const [otherAllergies, setOtherAllergies] = useState(profile.otherAllergies);

  const toggle = (
    ids: string[],
    setIds: (next: string[]) => void,
    id: string,
  ) => setIds(ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]);

  // Dị ứng/bệnh lý/chế độ ăn và "Dị ứng khác" (tự gõ) lưu lên server; chỉ chip "Khác" không có mục
  // tương ứng trên BE nên giữ ở máy — xem healthProfileService.updateHealthSettings.
  const handleSave = () => {
    updateSettings.mutate(
      { allergyIds, healthConditionIds, dietaryPreferenceIds, otherAllergies },
      { onSuccess: () => navigation.goBack() },
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Dị ứng & sức khỏe" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-lg py-sm"
      >
        <AppCard className="gap-sm">
          <AppText variant="h3">Dị ứng</AppText>
          <View className="flex-row flex-wrap gap-sm">
            {ALLERGY_OPTIONS.map(option => (
              <AppChip
                key={option.id}
                label={option.label}
                selected={allergyIds.includes(option.id)}
                onPress={() => toggle(allergyIds, setAllergyIds, option.id)}
              />
            ))}
          </View>
          <AppInput
            label="Dị ứng khác"
            placeholder="VD: dứa, kiwi…"
            leftIcon={<Plus size={20} color={colors.textSecondary} />}
            value={otherAllergies}
            maxLength={OTHER_ALLERGIES_MAX_LENGTH}
            onChangeText={setOtherAllergies}
          />
          <AppText variant="caption" color="secondary">
            Phân tách bằng dấu phẩy. Món có tên hoặc nguyên liệu trùng sẽ bị loại khỏi gợi ý và thực đơn.
          </AppText>
        </AppCard>

        <AppCard className="gap-sm">
          <AppText variant="h3">Tình trạng sức khỏe</AppText>
          <View className="flex-row flex-wrap gap-sm">
            {HEALTH_CONDITION_OPTIONS.map(option => (
              <AppChip
                key={option.id}
                label={option.label}
                selected={healthConditionIds.includes(option.id)}
                onPress={() => toggle(healthConditionIds, setHealthConditionIds, option.id)}
              />
            ))}
          </View>
        </AppCard>

        <AppCard className="gap-sm">
          <AppText variant="h3">Chế độ ăn</AppText>
          <View className="flex-row flex-wrap gap-sm">
            {DIETARY_PREFERENCE_OPTIONS.map(option => (
              <AppChip
                key={option.id}
                label={option.label}
                selected={dietaryPreferenceIds.includes(option.id)}
                onPress={() => toggle(dietaryPreferenceIds, setDietaryPreferenceIds, option.id)}
              />
            ))}
          </View>
        </AppCard>

        <InlineBanner
          tone="neutral"
          icon={<Info size={20} color={colors.info} />}
          description="Thay đổi sẽ cập nhật gợi ý món, thực đơn và cảnh báo sản phẩm. SmartMeal không thay thế tư vấn của bác sĩ."
        />
      </ScrollView>

      <View className="gap-xs py-md">
        {updateSettings.isError ? (
          <AppText variant="caption" color="error" className="text-center">
            {updateSettings.error.message}
          </AppText>
        ) : null}
        <AppButton label="Lưu thay đổi" onPress={handleSave} loading={updateSettings.isPending} />
      </View>
    </ScreenContainer>
  );
}
