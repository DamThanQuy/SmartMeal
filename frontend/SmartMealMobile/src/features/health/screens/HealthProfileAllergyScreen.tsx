import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Plus, ShieldCheck } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { InlineBanner, ScreenContainer } from '@/components/common';
import { AppButton, AppChip, AppInput, AppText } from '@/components/ui';
import { AUTH_ROUTES } from '@/constants/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { HealthProfileProgressHeader } from '../components/HealthProfileProgressHeader';
import { HealthProfileStepFooter } from '../components/HealthProfileStepFooter';
import { useHealthProfileForm } from '../hooks/useHealthProfileForm';
import { ALLERGY_OPTIONS } from '../types/health.types';

type Props = NativeStackScreenProps<AuthStackParamList, 'HealthProfileAllergy'>;

// design/HPAllergy.dc.html (bước 5/7, BR-101, BR-102, BR-140).
export function HealthProfileAllergyScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const data = useHealthProfileForm(state => state.data);
  const updateData = useHealthProfileForm(state => state.updateData);
  const [allergyIds, setAllergyIds] = useState<string[]>(data.allergyIds);
  const [otherText, setOtherText] = useState(data.otherAllergyText);
  const [noAllergies, setNoAllergies] = useState(data.noAllergies);

  const selectedLabels = useMemo(() => {
    const labels = ALLERGY_OPTIONS.filter(option => allergyIds.includes(option.id)).map(
      option => option.label,
    );
    if (otherText.trim()) labels.push(otherText.trim());
    return labels;
  }, [allergyIds, otherText]);

  const toggleAllergy = (id: string) => {
    setNoAllergies(false);
    setAllergyIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
  };

  const handleOtherTextChange = (text: string) => {
    setNoAllergies(false);
    setOtherText(text);
  };

  const handleToggleNoAllergies = () => {
    setNoAllergies(current => {
      const next = !current;
      if (next) {
        setAllergyIds([]);
        setOtherText('');
      }
      return next;
    });
  };

  const onSubmit = () => {
    updateData({
      allergyIds,
      otherAllergyText: otherText,
      noAllergies,
    });
    navigation.navigate(AUTH_ROUTES.HEALTH_PROFILE_CONDITIONS);
  };

  return (
    <ScreenContainer>
      <HealthProfileProgressHeader step={5} onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-lg py-md"
      >
        <View className="gap-xs">
          <AppText variant="h1">Bạn có dị ứng thực phẩm nào?</AppText>
          <AppText variant="bodyLg" color="secondary">
            Chọn tất cả dị ứng bạn có. Có thể thay đổi sau trong Cá nhân.
          </AppText>
        </View>

        <View className="flex-row flex-wrap gap-sm">
          {ALLERGY_OPTIONS.map(option => (
            <AppChip
              key={option.id}
              label={option.label}
              selected={allergyIds.includes(option.id)}
              onPress={() => toggleAllergy(option.id)}
            />
          ))}
        </View>

        <AppInput
          label="Dị ứng khác"
          placeholder="VD: dứa, kiwi…"
          leftIcon={<Plus size={20} color={colors.textSecondary} />}
          value={otherText}
          onChangeText={handleOtherTextChange}
        />

        <AppButton
          label="Tôi không có dị ứng"
          variant={noAllergies ? 'secondary' : 'outline'}
          onPress={handleToggleNoAllergies}
        />

        {selectedLabels.length > 0 ? (
          <InlineBanner
            tone="success-soft"
            icon={<ShieldCheck size={22} color={colors.primary} />}
            description={`Món chứa ${selectedLabels.join(', ')} sẽ bị loại khỏi gợi ý và thực đơn. Sản phẩm quét được sẽ có cảnh báo.`}
          />
        ) : null}
      </ScrollView>

      <View className="py-md">
        <HealthProfileStepFooter onBack={() => navigation.goBack()} onContinue={onSubmit} />
      </View>
    </ScreenContainer>
  );
}
