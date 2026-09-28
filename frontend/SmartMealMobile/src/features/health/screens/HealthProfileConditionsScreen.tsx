import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Info } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { InlineBanner, ScreenContainer } from '@/components/common';
import { AppButton, AppChip, AppText } from '@/components/ui';
import { AUTH_ROUTES } from '@/constants/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { HealthProfileProgressHeader } from '../components/HealthProfileProgressHeader';
import { HealthProfileStepFooter } from '../components/HealthProfileStepFooter';
import { useHealthProfileForm } from '../hooks/useHealthProfileForm';
import { HEALTH_CONDITION_OPTIONS } from '../types/health.types';

type Props = NativeStackScreenProps<AuthStackParamList, 'HealthProfileConditions'>;

// design.md mục 31 bước 6/7 "Sức khỏe" — chưa có artboard riêng, dựng theo mẫu chip của
// design/HPAllergy.dc.html. BR-110, BR-111, BR-112 (không thay thế chẩn đoán y khoa).
export function HealthProfileConditionsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const data = useHealthProfileForm(state => state.data);
  const updateData = useHealthProfileForm(state => state.updateData);
  const [conditionIds, setConditionIds] = useState<string[]>(data.healthConditionIds);
  const [noConditions, setNoConditions] = useState(data.noHealthConditions);

  const toggleCondition = (id: string) => {
    setNoConditions(false);
    setConditionIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
  };

  const handleToggleNoConditions = () => {
    setNoConditions(current => {
      const next = !current;
      if (next) setConditionIds([]);
      return next;
    });
  };

  const onSubmit = () => {
    updateData({ healthConditionIds: conditionIds, noHealthConditions: noConditions });
    navigation.navigate(AUTH_ROUTES.HEALTH_PROFILE_DIET);
  };

  return (
    <ScreenContainer>
      <HealthProfileProgressHeader step={6} onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-lg py-md"
      >
        <View className="gap-xs">
          <AppText variant="h1">Bạn có bệnh lý nào cần lưu ý?</AppText>
          <AppText variant="bodyLg" color="secondary">
            SmartMeal sẽ giới hạn thực phẩm phù hợp với tình trạng sức khỏe của bạn.
          </AppText>
        </View>

        <View className="flex-row flex-wrap gap-sm">
          {HEALTH_CONDITION_OPTIONS.map(option => (
            <AppChip
              key={option.id}
              label={option.label}
              selected={conditionIds.includes(option.id)}
              onPress={() => toggleCondition(option.id)}
            />
          ))}
        </View>

        <AppButton
          label="Tôi không có bệnh lý"
          variant={noConditions ? 'secondary' : 'outline'}
          onPress={handleToggleNoConditions}
        />

        <InlineBanner
          tone="neutral"
          icon={<Info size={20} color={colors.info} />}
          description="Các chỉ số và gợi ý chỉ mang tính tham khảo, không thay thế chẩn đoán hay tư vấn của bác sĩ."
        />
      </ScrollView>

      <View className="py-md">
        <HealthProfileStepFooter onBack={() => navigation.goBack()} onContinue={onSubmit} />
      </View>
    </ScreenContainer>
  );
}
