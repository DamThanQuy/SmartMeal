import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertTriangle, FileText } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ErrorState, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppInput, AppText } from '@/components/ui';
import { todayIso, useAddMealLogEntries } from '@/features/nutrition';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { useAnalyzeOcrLabel } from '../hooks/useScanner';
import { CameraPermissionDeniedError } from '../services/scannerService';
import { ocrFieldsToNutrition, type OcrNutritionField } from '../types/scanner.types';

type Props = NativeStackScreenProps<MainStackParamList, 'OCRReview'>;

// design/OCRReview.dc.html (BR-130). Bắt buộc user kiểm tra/sửa trước khi lưu — trường "Đường"
// cố ý đọc không chắc để minh hoạ cảnh báo OCR.
export function OCRReviewScreen({ navigation, route }: Props) {
  const { mealType } = route.params;
  const { colors } = useTheme();
  const analyzeOcrLabel = useAnalyzeOcrLabel();
  const addMealLogEntries = useAddMealLogEntries(todayIso());

  const [productName, setProductName] = useState('');
  const [fields, setFields] = useState<OcrNutritionField[] | null>(null);

  useEffect(() => {
    analyzeOcrLabel.mutate(undefined, {
      onSuccess: result => {
        setProductName(result.productName);
        setFields(result.fields);
      },
      onError: error => {
        if (error instanceof CameraPermissionDeniedError) {
          navigation.replace(MAIN_STACK_ROUTES.STATE_PERMISSION, { mealType, returnTo: 'Barcode' });
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (label: string, value: string) => {
    setFields(current =>
      current
        ? current.map(field => (field.label === label ? { ...field, value, isUncertain: false } : field))
        : current,
    );
  };

  const handleSave = () => {
    if (!fields) return;
    const servingField = fields.find(field => field.label === 'Khẩu phần');
    const grams = Number(servingField?.value) || 100;
    addMealLogEntries.mutate(
      {
        mealType,
        entries: [
          {
            foodName: productName || 'Sản phẩm quét nhãn',
            servingLabel: `${servingField?.value ?? grams} ${servingField?.unit ?? 'g'}`,
            grams,
            nutrition: ocrFieldsToNutrition(fields),
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
  };

  if (analyzeOcrLabel.isPending || !fields) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Kiểm tra nhãn" onBack={() => navigation.goBack()} />
        <LoadingState lines={7} />
      </ScreenContainer>
    );
  }

  if (analyzeOcrLabel.isError) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Kiểm tra nhãn" onBack={() => navigation.goBack()} />
        <ErrorState
          description={analyzeOcrLabel.error.message}
          onRetry={() => analyzeOcrLabel.mutate(undefined)}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title="Kiểm tra nhãn" onBack={() => navigation.goBack()} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-lg py-xs">
        <View>
          <View className="h-[150px] items-center justify-center gap-xxs rounded-lg bg-primary-soft">
            <FileText size={36} color={colors.primary} />
            <AppText variant="caption" className="text-on-primary-soft">
              Ảnh bảng dinh dưỡng
            </AppText>
          </View>
          <AppBadge
            label="Đọc từ nhãn · hãy kiểm tra"
            tone="info"
            className="absolute left-sm top-sm bg-surface"
          />
        </View>

        <AppInput label="Tên sản phẩm" value={productName} onChangeText={setProductName} />

        <AppCard className="gap-0">
          <AppText variant="h3" className="pb-sm">
            Giá trị dinh dưỡng
          </AppText>
          {fields.map(field => (
            <View
              key={field.label}
              className="flex-row items-center gap-sm border-t border-border py-xs"
            >
              <View className="flex-1 gap-xxs">
                <AppText variant="body">{field.label}</AppText>
                {field.isUncertain ? (
                  <View className="flex-row items-center gap-xxs">
                    <AlertTriangle size={12} color={colors.warning} />
                    <AppText variant="caption" className="font-sans-semibold text-warning-text">
                      Không rõ · kiểm tra lại
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppInput
                value={field.value}
                onChangeText={value => updateField(field.label, value)}
                keyboardType="numeric"
                className={`w-[100px] text-right ${field.isUncertain ? 'border-warning bg-warning-soft' : ''}`}
                rightAdornment={
                  <AppText variant="body" color="secondary">
                    {field.unit}
                  </AppText>
                }
              />
            </View>
          ))}
        </AppCard>

        {addMealLogEntries.isError ? (
          <AppText variant="caption" color="error" className="text-center">
            {addMealLogEntries.error.message}
          </AppText>
        ) : null}
      </ScrollView>

      <View className="flex-row gap-sm py-md">
        <AppButton label="Chụp lại" variant="outline" onPress={() => navigation.goBack()} />
        <AppButton
          label="Lưu & thêm vào nhật ký"
          onPress={handleSave}
          loading={addMealLogEntries.isPending}
          className="flex-1"
        />
      </View>
    </ScreenContainer>
  );
}
